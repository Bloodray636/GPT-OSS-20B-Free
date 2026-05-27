import { supabase } from './config.js';

// Настройки пользователя
export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('theme, save_history')
    .eq('user_id', userId)
    .single();

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

  return data;
};

export const getChatById = async (chatId, userId) => {
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single();

  if (chatError || !chat) {
    return null;
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, role, content, reasoning, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (msgError) {
    throw msgError;
  }

  chat.messages = messages || [];

  return chat;
};

export const saveChat = async (chat, userId) => {
  const { error: chatError } = await supabase
    .from('chats')
    .upsert(
      {
        id: chat.id,
        user_id: userId,
        title: chat.title,
        created_at: chat.createdAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (chatError) {
    throw new Error(`Ошибка сохранения чата: ${chatError.message}`);
  }

  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', chat.id);

  if (deleteError) {
    throw new Error(`Ошибка удаления старых сообщений: ${deleteError.message}`);
  }

  if (chat.messages?.length) {
    const messagesToInsert = chat.messages.map(msg => ({
      chat_id: chat.id,
      role: msg.role,
      content: msg.content,
      reasoning: msg.reasoning || null,
    }));

    const { error: insertError } = await supabase
      .from('messages')
      .insert(messagesToInsert);

    if (insertError) {
      throw new Error(`Failed to insert messages: ${insertError.message}`);
    }
  }
};

export const deleteChat = async (chatId, userId) => {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
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

export async function saveChatSummary(chatId, summaryText) {
  const { error } = await supabase
    .from('chat_summaries')
    .insert({ chat_id: chatId, summary_text: summaryText });

  if (error) {
    console.error('Failed to save chat summary:', error);
  }
}

export async function getChatSummaries(chatId, limit = 3) {
  const { data, error } = await supabase
    .from('chat_summaries')
    .select('summary_text')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data.map(row => row.summary_text);
}

export async function getChatLastSummary(chatId) {
  const summaries = await getChatSummaries(chatId, 1);
  return summaries.length ? summaries[0] : null;
}