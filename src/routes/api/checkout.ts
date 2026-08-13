import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      GET: async () => {
        const { isStripeConfigured } = await import("@/lib/atelier.server");
        const ready = await isStripeConfigured();
        return Response.json({ ready });
      },
      POST: async ({ request }) => {
        const lib = await import("@/lib/atelier.server");
        const { getMarketPricing, planPrice } = await import("@/lib/eu-pricing.server");
        const { detectVisitorLocale } = await import("@/lib/eu-locale.server");
        const {
          newOrderUid,
          newDownloadToken,
          downloadExpiryDate,
          createCheckoutSession,
          createOrder,
          trackCheckoutEvent,
          isStripeConfigured,
          resolveBaseUrl,
          resolveClientIp,
          normalizeUtmifyTracking,
          sendUtmifyOrder,
        } = lib;

        let body: {
          plan?: string;
          email?: string;
          name?: string;
          country?: string;
          language?: string;
          productName?: string;
          productDescription?: string;
          tracking?: Record<string, unknown>;
        } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* ignore */
        }
        const { plan, email, name, country, language, productName, productDescription, tracking } =
          body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return Response.json(
            { error: "Gültige E-Mail erforderlich." },
            { status: 400 },
          );
        }

        const normalizedPlan = (plan === "premium" ? "premium" : "essentiell") as
          | "essentiell"
          | "premium";

        const detected = detectVisitorLocale(request, country || null);
        if (detected.blocked) {
          return Response.json({ error: "Region not available." }, { status: 403 });
        }

        const marketCountry = country?.trim().toUpperCase() || detected.country;
        const marketLang = language || detected.language;
        const pricing = await getMarketPricing({
          country: marketCountry,
          language: marketLang,
        });
        const selected = planPrice(pricing, normalizedPlan);

        const baseUrl = resolveBaseUrl(request);
        const orderUid = newOrderUid();
        const customerIp = resolveClientIp(request);
        const trackingParams = normalizeUtmifyTracking(tracking);

        if (!(await isStripeConfigured())) {
          return Response.json(
            {
              error: "Stripe ist nicht konfiguriert.",
              code: "stripe_not_configured",
            },
            { status: 503 },
          );
        }

        try {
          const session = await createCheckoutSession({
            plan: normalizedPlan,
            email: email.trim().toLowerCase(),
            customerName: (name || "").trim(),
            successUrl: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/kasse.html?plan=${normalizedPlan}&cancelled=1`,
            orderUid,
            currency: pricing.currency.toLowerCase(),
            amountCents: selected.cents,
            eurAmountCents: selected.eurCents,
            locale: pricing.stripeLocale,
            ...(productName?.trim() ? { productName: productName.trim() } : {}),
            ...(productDescription?.trim()
              ? { productDescription: productDescription.trim() }
              : {}),
          });

          try {
            await createOrder({
              order_uid: orderUid,
              email: email.trim().toLowerCase(),
              customer_name: (name || "").trim() || null,
              plan: normalizedPlan,
              amount_cents: selected.cents,
              currency: pricing.currency.toLowerCase(),
              status: "pending",
              stripe_session_id: session.id,
              download_token: newDownloadToken(),
              download_expires_at: downloadExpiryDate(),
            });

            await trackCheckoutEvent("checkout_created", normalizedPlan, email, {
              order_uid: orderUid,
              session_id: session.id,
              country: marketCountry,
              currency: pricing.currency,
              customer_ip: customerIp,
              product_name: productName?.trim() || null,
              tracking: trackingParams,
            });

            void sendUtmifyOrder({
              order: {
                order_uid: orderUid,
                email: email.trim().toLowerCase(),
                customer_name: (name || "").trim() || null,
                plan: normalizedPlan,
                amount_cents: selected.cents,
                currency: pricing.currency.toLowerCase(),
                created_at: new Date().toISOString(),
                paid_at: null,
              },
              status: "waiting_payment",
              tracking: trackingParams,
              country: marketCountry,
              customerIp,
              productName: productName?.trim() || null,
            });
          } catch (persistErr) {
            console.error("checkout persist warning:", persistErr);
          }

          if (!session.url) {
            return Response.json(
              { error: "Stripe URL fehlt.", code: "stripe_no_url" },
              { status: 502 },
            );
          }

          return Response.json({ url: session.url, sessionId: session.id });
        } catch (err) {
          console.error("checkout error:", err);
          return Response.json(
            {
              error: err instanceof Error ? err.message : "Checkout fehlgeschlagen.",
              code: "stripe_error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
