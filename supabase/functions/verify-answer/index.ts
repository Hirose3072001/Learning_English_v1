import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { questionId, selectedIndex } = await req.json();

    if (!questionId || selectedIndex === undefined || selectedIndex === null) {
      return new Response(
        JSON.stringify({ error: "Missing questionId or selectedIndex" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch question with correct_index using service role (bypasses RLS)
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("correct_index, explanation, options")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      return new Response(
        JSON.stringify({ error: "Question not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isCorrect = selectedIndex === question.correct_index;
    const options = Array.isArray(question.options) 
      ? question.options 
      : JSON.parse(question.options as string);

    return new Response(
      JSON.stringify({
        isCorrect,
        correctIndex: question.correct_index,
        correctAnswer: options[question.correct_index],
        explanation: question.explanation,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
