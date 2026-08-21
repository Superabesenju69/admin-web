require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: 'ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_settings;'
  });
  console.log('Realtime toggle result:', data, error);
}
run();
