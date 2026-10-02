import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, Modal, 
  TextInput, ScrollView, KeyboardAvoidingView, Platform, 
  ActivityIndicator, SafeAreaView, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { Bot, Send, Sparkles, User, HelpCircle, BookOpen, MessageSquare, CheckCircle2, X } from 'lucide-react-native';
import { supabase } from '../supabase/client';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  { id: '1', icon: CheckCircle2, label: 'Sửa lỗi ngữ pháp', prompt: "Hãy giúp tôi kiểm tra và sửa lỗi ngữ pháp câu sau đây và giải thích chi tiết: 'Yesterday I go to school and buying a new book.'" },
  { id: '2', icon: BookOpen, label: 'Phân biệt In / On / At', prompt: 'Hãy phân biệt cách dùng giới từ In, On, At trong chỉ thời gian và địa điểm với các ví dụ dễ nhớ nhất.' },
  { id: '3', icon: MessageSquare, label: 'Luyện hội thoại cafe', prompt: 'Chúng ta hãy luyện hội thoại bằng tiếng Anh nhé. Bạn đóng vai nhân viên quán cafe, tôi sẽ là khách hàng vào order đồ uống. Hãy bắt đầu chào tôi bằng tiếng Anh đi!' },
  { id: '4', icon: HelpCircle, label: 'Cách nhớ từ vựng', prompt: 'Bạn có phương pháp nào hiệu quả để học và nhớ từ vựng tiếng Anh lâu quên không?' }
];

const BUILT_IN_RESPONSES: Record<string, string> = {
  "Sửa lỗi ngữ pháp": `📝 **Duo Tutor đã sửa lỗi cho bạn:**\n\nCâu ban đầu: *"Yesterday I go to school and buying a new book."*\n👉 **Câu sửa chuẩn:** *"Yesterday I **went** to school and **bought** a new book."*\n\n💡 **Giải thích chi tiết:**\n1. **Yesterday (Hôm qua)** là dấu hiệu của **Thì Quá khứ đơn (Past Simple)**.\n2. Động từ **go** chuyển thành quá khứ là **went**.\n3. Cấu trúc song song với từ nối **and**: động từ thứ hai cũng phải chia ở quá khứ đơn, **buying** (hoặc buy) chuyển thành **bought**.`,
  "Phân biệt In / On / At": `🎯 **Mẹo siêu dễ nhớ để phân biệt IN - ON - AT:**\n\nQuy tắc hình tam giác ngược (từ rộng đến hẹp):\n1. **IN (Rộng lớn nhất):** Dùng cho **Năm, Tháng, Mùa, Thành phố/Quốc gia**.\n   * *Ví dụ:* in 2024, in May, in summer, in Hanoi.\n2. **ON (Trung bình):** Dùng cho **Ngày cụ thể, Thứ trong tuần, Ngày lễ có chữ Day**.\n   * *Ví dụ:* on Monday, on May 15th, on New Year's Day.\n3. **AT (Cụ thể nhất):** Dùng cho **Giờ chính xác, Địa điểm cụ thể nhỏ**.\n   * *Ví dụ:* at 7:00 PM, at school, at home, at noon.`,
  "Luyện hội thoại cafe": `☕ **Barista Duo:** \n*"Hello! Welcome to Duo Coffee Shop! What can I get for you today? Would you like something hot or iced?"*\n\n👉 *(Bạn hãy gõ câu trả lời bằng tiếng Anh ở dưới nhé, ví dụ: "I would like an iced latte, please.")*`,
  "Cách nhớ từ vựng": `💡 **4 Phương pháp học từ vựng "nhớ dai" cùng Duo:**\n\n1. **Học theo cụm từ (Collocations):** Đừng học từ đơn lẻ. Thay vì chỉ học *"make"*, hãy học cắm cụm *"make a decision" (đưa ra quyết định)*.\n2. **Phương pháp Spaced Repetition (Lặp lại ngắt quãng):** Ôn lại từ sau 1 ngày, 3 ngày, 7 ngày.\n3. **Đặt câu với chính bạn:** Tự viết 1 câu có ý nghĩa liên quan đến cuộc sống hàng ngày của bạn với từ mới đó.\n4. **Học qua hình ảnh & Mini-game:** Chơi các màn giải cứu lâu đài (Word Defense) và chạy đua từ vựng ngay trong app Learning English này!`
};

export default function AITutorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: '👋 Xin chào! Mình là **Duo Tutor** - Gia sư AI Tiếng Anh cá nhân của bạn. Bạn có thắc mắc về ngữ pháp, cần sửa lỗi câu hay muốn luyện hội thoại tiếng Anh không?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      // 1. Try Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-tutor', {
        body: { 
          message: queryText,
          history: messages.slice(-6).map(m => ({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.text }))
        }
      });

      if (!error && data?.reply) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        return;
      }

      // 2. Client Fallback (Expo ENV)
      const clientApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (clientApiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `Bạn là Duo Tutor, gia sư tiếng Anh nhiệt tình trả lời bằng tiếng Việt dễ hiểu. Lịch sử cuộc trò chuyện gần đây:\n${JSON.stringify(messages.slice(-4).map(m => ({ role: m.sender, text: m.text })))}\n\nCâu hỏi mới: ${queryText}` }]
            }]
          })
        });
        const resJson = await response.json();
        const geminiReply = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiReply) {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: geminiReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          return;
        }
      }

      // 3. Offline fallback
      await new Promise(r => setTimeout(r, 800));
      const matchedKey = Object.keys(BUILT_IN_RESPONSES).find(k => queryText.includes(k) || queryText.toLowerCase().includes(k.toLowerCase()));
      let fallbackText = matchedKey ? BUILT_IN_RESPONSES[matchedKey] : null;

      if (!fallbackText) {
        if (queryText.toLowerCase().includes("hello") || queryText.toLowerCase().includes("iced latte") || queryText.toLowerCase().includes("coffee")) {
          fallbackText = `☕ **Barista Duo:** *"Great choice! An iced latte is coming right up. That will be $4.50, please. Will you pay by cash or card?"* \n\n👉 *(Tuyệt vời! Bạn hãy trả lời tiếp bằng tiếng Anh nhé)*`;
        } else {
          fallbackText = `🤖 **Duo Tutor phản hồi:**\n\nCâu hỏi của bạn về *"**${queryText}**"* rất hay!\n\n💡 *(Lưu ý: Để bật kết nối AI thực tế 100%, hãy cấu hình GEMINI_API_KEY ở server nhé. Hiện tại AI Tutor đang phản hồi ở chế độ demo offline)*.`;
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '❌ Xin lỗi, kết nối AI đang tạm gián đoạn. Bạn vui lòng thử lại sau nhé!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Sparkles size={24} color="#fff" />
        <View style={styles.fabBadge} />
      </TouchableOpacity>

      {/* Modal / Bottom Sheet */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            style={styles.modalContent} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <SafeAreaView style={styles.safeArea}>
              
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.avatarWrapper}>
                    <Bot size={24} color="#fff" />
                    <View style={styles.onlineDot} />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Duo AI Tutor</Text>
                    <Text style={styles.headerSubtitle}>Luôn sẵn sàng hỗ trợ 24/7</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                  <X size={24} color="#777" />
                </TouchableOpacity>
              </View>

              {/* Chat Area */}
              <ScrollView 
                ref={scrollViewRef}
                style={styles.chatArea} 
                contentContainerStyle={styles.chatContent}
                keyboardShouldPersistTaps="handled"
              >
                {messages.map((m) => (
                  <View key={m.id} style={[styles.messageRow, m.sender === 'user' ? styles.messageRowUser : styles.messageRowAi]}>
                    <View style={[styles.messageAvatar, m.sender === 'user' ? styles.messageAvatarUser : styles.messageAvatarAi]}>
                      {m.sender === 'user' ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
                    </View>
                    <View style={styles.messageBubbleWrapper}>
                      <View style={[styles.messageBubble, m.sender === 'user' ? styles.messageBubbleUser : styles.messageBubbleAi]}>
                        <Text style={[styles.messageText, m.sender === 'user' ? styles.messageTextUser : styles.messageTextAi]}>
                          {m.text}
                        </Text>
                      </View>
                      <Text style={[styles.timestamp, m.sender === 'user' && styles.timestampRight]}>{m.timestamp}</Text>
                    </View>
                  </View>
                ))}
                
                {loading && (
                  <View style={[styles.messageRow, styles.messageRowAi]}>
                    <View style={[styles.messageAvatar, styles.messageAvatarAi]}>
                      <Bot size={16} color="#fff" />
                    </View>
                    <View style={[styles.messageBubble, styles.messageBubbleAi, styles.typingBubble]}>
                      <ActivityIndicator size="small" color="#059669" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Suggested Prompts */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>
                  <Sparkles size={12} color="#f59e0b" /> Gợi ý hỏi nhanh:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsList}>
                  {SUGGESTED_PROMPTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity 
                        key={item.id} 
                        style={styles.suggestionChip}
                        onPress={() => handleSend(item.prompt)}
                        disabled={loading}
                      >
                        <Icon size={14} color="#059669" />
                        <Text style={styles.suggestionText}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Input Area */}
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Hỏi Duo ngữ pháp, từ vựng..."
                  placeholderTextColor="#a1a1aa"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                  onPress={() => handleSend()}
                  disabled={!input.trim() || loading}
                >
                  <Send size={20} color="#fff" />
                </TouchableOpacity>
              </View>

            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  fabBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { height: '90%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#ecfdf5', borderBottomWidth: 1, borderBottomColor: '#d1fae5' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#047857' },
  headerSubtitle: { fontSize: 12, color: '#059669' },
  closeBtn: { padding: 8 },
  chatArea: { flex: 1, backgroundColor: '#fff' },
  chatContent: { padding: 16, gap: 16 },
  messageRow: { flexDirection: 'row', gap: 8, maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageRowAi: { alignSelf: 'flex-start' },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  messageAvatarUser: { backgroundColor: '#58CC02' },
  messageAvatarAi: { backgroundColor: '#10b981' },
  messageBubbleWrapper: { flex: 1 },
  messageBubble: { padding: 12, borderRadius: 20 },
  messageBubbleUser: { backgroundColor: '#58CC02', borderTopRightRadius: 4 },
  messageBubbleAi: { backgroundColor: '#f4f4f5', borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#e5e5e5' },
  typingBubble: { paddingVertical: 16, width: 60, alignItems: 'center' },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: '#fff', fontWeight: '500' },
  messageTextAi: { color: '#333' },
  timestamp: { fontSize: 10, color: '#a1a1aa', marginTop: 4, marginHorizontal: 4 },
  timestampRight: { textAlign: 'right' },
  suggestionsContainer: { backgroundColor: '#f9fafb', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  suggestionsTitle: { fontSize: 12, fontWeight: 'bold', color: '#777', paddingHorizontal: 16, marginBottom: 8 },
  suggestionsList: { paddingHorizontal: 16, gap: 8 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e5e5e5' },
  suggestionText: { fontSize: 13, fontWeight: '500', color: '#333' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#e5e5e5', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#f4f4f5', borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 100, color: '#333' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: '#a1a1aa' },
});
