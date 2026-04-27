import { supabase } from "../lib/supabase";

type NotificationSuppressionRow = {
  transaction_id: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

export async function fetchMutedReminderTransactionIds(userId: string): Promise<Set<string>> {
  if (!supabase) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("finance_notification_suppressions")
    .select("transaction_id")
    .eq("user_id", userId)
    .in("channel", ["all", "in_app"])
    .returns<NotificationSuppressionRow[]>();

  if (error) {
    console.error("Falha ao carregar preferencias de notificacao", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.transaction_id));
}

export async function muteFinanceTransactionReminder(userId: string, transactionId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error: suppressionError } = await supabase.from("finance_notification_suppressions").upsert(
    {
      user_id: userId,
      transaction_id: transactionId,
      channel: "all",
      reason: "user_muted_transaction",
      muted_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,transaction_id,channel",
    }
  );

  if (suppressionError) {
    throw new Error(`Nao foi possivel silenciar esta conta: ${getErrorMessage(suppressionError)}`);
  }

  const { error: notificationError } = await supabase
    .from("finance_notifications")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("transaction_id", transactionId)
    .eq("channel", "in_app")
    .in("status", ["queued", "unread"]);

  if (notificationError) {
    console.error("Conta silenciada, mas nao foi possivel dispensar notificacoes antigas", notificationError);
  }
}
