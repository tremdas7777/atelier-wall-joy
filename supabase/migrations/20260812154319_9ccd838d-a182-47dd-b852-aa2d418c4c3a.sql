revoke execute on function public.orders_status_counts() from public;
revoke execute on function public.orders_status_counts() from anon;
revoke execute on function public.orders_status_counts() from authenticated;
grant execute on function public.orders_status_counts() to service_role;