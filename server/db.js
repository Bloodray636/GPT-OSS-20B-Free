import { supabase } from './config.js';

// Настройки пользователя
export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('theme, save_history')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return {
    theme: data?.theme || 'dark',
    saveHistory: data?.save_history !== false,
  };
};

export const saveUserSettings = async (userId, theme, saveHistory) => {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { 
        user_id: userId, 
        theme, 
        save_history: saveHistory 
      }, 
      { 
        onConflict: 'user_id' 
      }
    );

  if (error) {
    throw error;
  }
};

// Чаты
export const getChats = async (userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('updated_at', { 
      ascending: false 
    });

  if (error){
    throw error;
  }

  return data;
};

export const getChatById = async (chatId, userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single();

  if (error){
    return null;
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, reasoning, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { 
      ascending: true 
    });

  data.messages = messages || [];

  return data;
};

export const saveChat = async (chat, userId) => {
  await supabase
    .from('chats')
    .upsert(
      {
        id: chat.id,
        user_id: userId,
        title: chat.title,
        created_at: chat.createdAt,
        updated_at: new Date().toISOString(),
      },
      { 
        onConflict: 'id' 
      }
    );

  await supabase
    .from('messages')
    .delete()
    .eq('chat_id', chat.id);

  if (chat.messages?.length) {
    const messagesToInsert = chat.messages.map(msg => ({
      chat_id: chat.id,
      role: msg.role,
      content: msg.content,
      reasoning: msg.reasoning || null,
    }));

    await supabase
      .from('messages')
      .insert(messagesToInsert);
  }
};

export const deleteChat = async (chatId, userId) => {
  await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', userId);
};

export async function logAIUsage(userId, model, promptTokens, completionTokens, estimatedCost) {
  const totalTokens = promptTokens + completionTokens;

  const { error } = await supabase
    .from('ai_usage_logs')
    .insert({
      user_id: userId,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
    });

  if (error) {
    console.error('Failed to log AI usage:', error);
  }
}