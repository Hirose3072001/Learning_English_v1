import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bot, Send, Sparkles, User, HelpCircle, BookOpen, MessageSquare, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
  { icon: CheckCircle2, label: "Sửa lỗi ngữ pháp", prompt: "Hãy giúp tôi kiểm tra và sửa lỗi ngữ pháp câu sau đây và giải thích chi tiết: 'Yesterday I go to school and buying a new book.'" },
  { icon: BookOpen, label: "Phân biệt In / On / At", prompt: "Hãy phân biệt cách dùng giới từ In, On, At trong chỉ thời gian và địa điểm với các ví dụ dễ nhớ nhất." },
  { icon: MessageSquare, label: "Luyện hội thoại cafe", prompt: "Chúng ta hãy luyện hội thoại bằng tiếng Anh nhé. Bạn đóng vai nhân viên quán cafe, tôi sẽ là khách hàng vào order đồ uống. Hãy bắt đầu chào tôi bằng tiếng Anh đi!" },
  { icon: HelpCircle, label: "Cách nhớ từ vựng", prompt: "Bạn có phương pháp nào hiệu quả để học và nhớ từ vựng tiếng Anh lâu quên không?" }
];

const BUILT_IN_RESPONSES: Record<string, string> = {
  "Sửa lỗi ngữ pháp": `📝 **Duo Tutor đã sửa lỗi cho bạn:**

Câu ban đầu: *"Yesterday I go to school and buying a new book."*
👉 **Câu sửa chuẩn:** *"Yesterday I **went** to school and **bought** a new book."*

💡 **Giải thích chi tiết:**
1. **Yesterday (Hôm qua)** là dấu hiệu của **Thì Quá khứ đơn (Past Simple)**.
2. Động từ **go** chuyển thành quá khứ là **went**.
3. Cấu trúc song song với từ nối **and**: động từ thứ hai cũng phải chia ở quá khứ đơn, **buying** (hoặc buy) chuyển thành **bought**.`,

  "Phân biệt In / On / At": `🎯 **Mẹo siêu dễ nhớ để phân biệt IN - ON - AT:**

Quy tắc hình tam giác ngược (từ rộng đến hẹp):
1. **IN (Rộng lớn nhất):** Dùng cho **Năm, Tháng, Mùa, Thành phố/Quốc gia**.
   * *Ví dụ:* in 2024, in May, in summer, in Hanoi.
2. **ON (Trung bình):** Dùng cho **Ngày cụ thể, Thứ trong tuần, Ngày lễ có chữ Day**.
   * *Ví dụ:* on Monday, on May 15th, on New Year's Day.
3. **AT (Cụ thể nhất):** Dùng cho **Giờ chính xác, Địa điểm cụ thể nhỏ**.
   * *Ví dụ:* at 7:00 PM, at school, at home, at noon.`,

  "Luyện hội thoại cafe": `☕ **Barista Duo:** 
*"Hello! Welcome to Duo Coffee Shop! What can I get for you today? Would you like something hot or iced?"*

👉 *(Bạn hãy gõ câu trả lời bằng tiếng Anh ở dưới nhé, ví dụ: "I would like an iced latte, please.")*`,

  "Cách nhớ từ vựng": `💡 **4 Phương pháp học từ vựng "nhớ dai" cùng Duo:**

1. **Học theo cụm từ (Collocations):** Đừng học từ đơn lẻ. Thay vì chỉ học *"make"*, hãy học cắm cụm *"make a decision" (đưa ra quyết định)*.
2. **Phương pháp Spaced Repetition (Lặp lại ngắt quãng):** Ôn lại từ sau 1 ngày, 3 ngày, 7 ngày.
3. **Đặt câu với chính bạn:** Tự viết 1 câu có ý nghĩa liên quan đến cuộc sống hàng ngày của bạn với từ mới đó.
4. **Học qua hình ảnh & Mini-game:** Chơi các màn giải cứu lâu đài (Word Defense) và chạy đua từ vựng ngay trong app Learning English này!`
};

export const AITutorModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "👋 Xin chào! Mình là **Duo Tutor** - Gia sư AI Tiếng Anh cá nhân của bạn. Bạn có thắc mắc về ngữ pháp, cần sửa lỗi câu hay muốn luyện hội thoại tiếng Anh không?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // 1. Try calling Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: { 
          message: queryText,
          history: messages.slice(-6).map(m => ({ role: m.sender === "ai" ? "assistant" : "user", content: m.text }))
        }
      });

      if (!error && data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
        return;
      }

      // 2. Fallback check for Client VITE_GEMINI_API_KEY if configured
      const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (clientApiKey) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `Bạn là Duo Tutor, gia sư tiếng Anh nhiệt tình trả lời bằng tiếng Việt dễ hiểu. Lịch sử cuộc trò chuyện gần đây:\n${JSON.stringify(messages.slice(-4).map(m => ({ role: m.sender, text: m.text })))}\n\nCâu hỏi mới: ${queryText}` }]
                }
              ]
            })
          });
          const resJson = await response.json();
          if (resJson?.error) {
            console.error("Gemini API Error:", resJson.error);
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                text: `⚠️ **Lỗi từ Google Gemini API:** \`${resJson.error.message || "Invalid API key"}\`\n\n👉 Bạn hãy kiểm tra lại tính chính xác của khoá VITE_GEMINI_API_KEY trong file .env và nhớ **tắt terminal chạy server (bấm Ctrl + C) rồi chạy lại lệnh npm run start** để nhận biến môi trường mới nhé!`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            setLoading(false);
            return;
          }
          const geminiReply = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (geminiReply) {
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                text: geminiReply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            setLoading(false);
            return;
          }
        } catch (apiErr: any) {
          console.error("Fetch Gemini error:", apiErr);
        }
      }

      // 3. Built-in interactive Demo Mode fallback
      await new Promise((r) => setTimeout(r, 800)); // Simulate thinking
      
      // Match suggested prompt label or general response
      const matchedKey = Object.keys(BUILT_IN_RESPONSES).find(k => queryText.includes(k) || queryText.toLowerCase().includes(k.toLowerCase()));
      let fallbackText = matchedKey ? BUILT_IN_RESPONSES[matchedKey] : null;

      if (!fallbackText) {
        if (queryText.toLowerCase().includes("hello") || queryText.toLowerCase().includes("iced latte") || queryText.toLowerCase().includes("coffee")) {
          fallbackText = `☕ **Barista Duo:** *"Great choice! An iced latte is coming right up. That will be $4.50, please. Will you pay by cash or card?"* \n\n👉 *(Tuyệt vời! Bạn hãy trả lời tiếp bằng tiếng Anh nhé: "I will pay by card" hoặc "Here is cash")*`;
        } else {
          fallbackText = `🤖 **Duo Tutor phản hồi:**\n\nCâu hỏi của bạn về *"**${queryText}**"* rất hay!\n\n💡 *(Lưu ý: Để bật kết nối AI thực tế 100% với Google Gemini, bạn hãy thêm biến môi trường **GEMINI_API_KEY** vào Supabase Edge Functions hoặc file **.env** của dự án nhé! Hiện tại AI Tutor đang phản hồi ở chế độ Gia sư thông minh offline)*.`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "❌ Xin lỗi, kết nối AI đang tạm gián đoạn. Bạn vui lòng kiểm tra lại cấu hình mạng hoặc thử lại nhé!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-24 right-4 z-40 rounded-full shadow-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 size-14 border-2 border-white/30 transition-transform active:scale-95 group"
          title="Hỏi Gia sư AI Tiếng Anh"
        >
          <Sparkles className="size-6 text-white animate-spin-slow group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-3 bg-amber-500"></span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 border-l border-border/60 bg-background shadow-2xl z-50">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-sky-600/10">
          <SheetTitle className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <div className="relative flex items-center justify-center size-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md">
              <Bot className="size-6" />
              <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-lg leading-tight">Duo AI Tutor</span>
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Luôn sẵn sàng hỗ trợ 24/7
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-2.5 max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
              )}
            >
              <div className={cn(
                "size-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                m.sender === "user" ? "bg-primary text-primary-foreground" : "bg-emerald-500 text-white"
              )}>
                {m.sender === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>

              <div className="flex flex-col gap-1">
                <div className={cn(
                  "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                  m.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                    : "bg-muted/80 text-foreground rounded-tl-none border border-border/50"
                )}>
                  {m.text}
                </div>
                <span className={cn(
                  "text-[10px] text-muted-foreground px-1",
                  m.sender === "user" ? "text-right" : "text-left"
                )}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 max-w-[80%] mr-auto animate-pulse">
              <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-1">
                <Bot className="size-4" />
              </div>
              <div className="bg-muted/80 p-3.5 rounded-2xl rounded-tl-none border border-border/50 flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-emerald-500 animate-bounce"></div>
                <div className="size-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></div>
                <div className="size-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border/40">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" /> Gợi ý hỏi nhanh:
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
            {SUGGESTED_PROMPTS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  className="shrink-0 flex items-center gap-1.5 text-xs bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-foreground font-medium px-3 py-1.5 rounded-full border border-border/60 shadow-xs transition-colors"
                >
                  <IconComp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-3 border-t bg-background flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Hỏi Duo ngữ pháp, cách đặt câu..."
            className="flex-1 rounded-full bg-muted/50 border-border/60 focus-visible:ring-emerald-500"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="rounded-full size-10 bg-emerald-600 hover:bg-emerald-700 shrink-0 shadow-md"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
