-- 채팅 대화방
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL,
  user_nick text DEFAULT '',
  user_email text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open','closed')),
  last_message text DEFAULT '',
  unread_admin int DEFAULT 0,
  unread_user int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 채팅 메시지
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_uid text NOT NULL,
  sender_role text DEFAULT 'user' CHECK (sender_role IN ('user','admin')),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_uid);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, created_at);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 대화방만 조회/생성
CREATE POLICY chat_conv_user_select ON chat_conversations FOR SELECT USING (auth.uid()::text = user_uid);
CREATE POLICY chat_conv_user_insert ON chat_conversations FOR INSERT WITH CHECK (auth.uid()::text = user_uid);
CREATE POLICY chat_conv_user_update ON chat_conversations FOR UPDATE USING (auth.uid()::text = user_uid);

-- 메시지: 자기 대화방 메시지만 조회/생성
CREATE POLICY chat_msg_user_select ON chat_messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM chat_conversations WHERE user_uid = auth.uid()::text)
);
CREATE POLICY chat_msg_user_insert ON chat_messages FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM chat_conversations WHERE user_uid = auth.uid()::text)
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
