alter table public.meal_menus
  add column if not exists dishes jsonb not null default '[]'::jsonb;

update public.meal_menus
set dishes = coalesce(
  (
    select jsonb_agg(jsonb_build_object('name', trim(part), 'image_url', null))
    from regexp_split_to_table(menu_text, '\s*[·,]\s*') as parts(part)
    where length(trim(part)) > 0
  ),
  '[]'::jsonb
)
where dishes = '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'meal_menus_dishes_array'
      and conrelid = 'public.meal_menus'::regclass
  ) then
    alter table public.meal_menus
      add constraint meal_menus_dishes_array check (jsonb_typeof(dishes) = 'array');
  end if;
end;
$$;
