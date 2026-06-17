import { supabase } from '@/lib/supabase';
import type { ChildProfile, Protagonist, DevelopmentalStage } from '@/types';

export async function getChildren(): Promise<ChildProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createChild(
  name: string,
  developmentalStage: DevelopmentalStage,
  protagonist: Protagonist
): Promise<ChildProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('children')
    .insert({ user_id: user.id, name, developmental_stage: developmentalStage, protagonist })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteChild(id: string): Promise<void> {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
