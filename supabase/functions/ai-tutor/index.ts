import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history } = await req.json()

    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `Bạn là Duo Tutor - một gia sư tiếng Anh thông minh, hài hước và tận tâm của ứng dụng Learning English.
Nhiệm vụ của bạn:
1. Giải thích các câu hỏi về ngữ pháp, từ vựng, phát âm tiếng Anh một cách dễ hiểu, sinh động.
2. Giúp học viên sửa lỗi ngữ pháp trong câu tiếng Anh họ viết và giải thích lý do tại sao sai bằng tiếng Việt.
3. Khi học viên muốn luyện đóng vai (roleplay), hãy nhập vai tự nhiên và khuyến khích họ trả lời bằng tiếng Anh.
4. Trình bày câu trả lời rõ ràng, có cấu trúc đẹp mắt, sử dụng các biểu tượng cảm xúc (emoji) tích cực. Keep answers concise and engaging.`

    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured in Supabase secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nLịch sử trò chuyện:\n${JSON.stringify(history || [])}\n\nCâu hỏi mới nhất của học viên: ${message}` }],
            },
          ],
        }),
      }
    )

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message || "Gemini API Error")
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, Duo Tutor đang bận một chút, bạn thử lại sau nhé!"

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error("AI Tutor Error:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
