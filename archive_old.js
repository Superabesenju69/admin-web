const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://jyxvmtcvgodbclnwbyiw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eHZtdGN2Z29kYmNsbndieWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzMzNjcsImV4cCI6MjA4ODUwOTM2N30.QX6KpCli1HleQ-EILSPWmb69YKRBFFikWPAN3jV0MdI'
);

async function archiveOldTickets() {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    // Archive all 'done' tickets older than 12 hours
    const { error } = await supabase
        .from('kitchen_tickets')
        .update({ status: 'archived' })
        .eq('status', 'done')
        .lt('created_at', twelveHoursAgo);

    console.log(error ? `Error archiving done: ${error.message}` : 'Archived old done tickets.');

    // Also archive stale pending/in_progress tickets older than 12 hours
    const { error: err2 } = await supabase
        .from('kitchen_tickets')
        .update({ status: 'archived', completed_at: new Date().toISOString() })
        .in('status', ['pending', 'in_progress'])
        .lt('created_at', twelveHoursAgo);

    console.log(err2 ? `Error archiving stale: ${err2.message}` : 'Archived old stale tickets.');

    // Count remaining active tickets
    const { data } = await supabase
        .from('kitchen_tickets')
        .select('id, status')
        .neq('status', 'archived');

    console.log(`Remaining active tickets: ${data?.length || 0}`);
}

archiveOldTickets();
