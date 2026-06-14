import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const parserSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    role: { type: "string" },
    location: { type: "string" },
    experience: { type: "string" },
    summary: { type: "string" },
    clientBrief: { type: "string" },
    experienceDetails: { type: "string" },
    certifications: { type: "string" },
    projects: { type: "string" },
    education: { type: "string" },
    achievements: { type: "string" },
    skills: {
      type: "array",
      items: { type: "string" }
    },
    atsScore: { type: "integer" },
    wordCount: { type: "integer" },
    contactSignalsFound: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "fullName",
    "role",
    "location",
    "experience",
    "summary",
    "clientBrief",
    "experienceDetails",
    "certifications",
    "projects",
    "education",
    "achievements",
    "skills",
    "atsScore",
    "wordCount",
    "contactSignalsFound"
  ],
  additionalProperties: false
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function inferMimeType(fileName: string, fallback = "application/octet-stream") {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".rtf")) return "application/rtf";
  if (lower.endsWith(".txt")) return "text/plain";
  return fallback || "application/octet-stream";
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function extractOutputText(response: any) {
  if (typeof response.output_text === "string") return response.output_text;

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeClientBrief(value: unknown, candidateName: unknown) {
  let safeValue = String(value || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
    .replace(/\b(?:https?:\/\/|www\.)[^\s,;]+/gi, "")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "")
    .split(/\n+/)
    .filter((line) => !/^\s*(email|e-mail|phone|mobile|telephone|tel|address|linkedin|contact|website)\b\s*[:,-]/i.test(line))
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const fullName = String(candidateName || "").trim();
  if (fullName) {
    safeValue = safeValue.replace(new RegExp(escapeRegExp(fullName), "gi"), "the candidate");
  }

  return safeValue.split(/\s+/).filter(Boolean).slice(0, 300).join(" ");
}

async function parseCvWithOpenAI(fileBytes: Uint8Array, fileName: string, mimeType: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in Supabase secrets.");
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const base64 = encodeBase64(fileBytes);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are a recruitment CV parser for Urgent Recruite.",
                "Read the uploaded CV file itself. Do not count the candidate note, career-interest field, or recruiter notes as CV words.",
                "The uploaded CV file is the sole source for every extracted professional detail. Do not use landing-page form fields, candidate notes, career interests, or submitted metadata to create the summary or client brief.",
                "Extract only professional, non-contact profile information suitable for an anonymous client shortlist.",
                "Do not include phone numbers, email addresses, physical addresses, LinkedIn URLs, personal websites, or other direct contact details in any public summary field.",
                "Do not include private notes written by the candidate unless they describe professional experience, projects, education, certifications, or skills.",
                "Write summary as a clear English CV summary for the admin, translating faithfully into English when the CV is in another language.",
                "For experienceDetails, extract work experience with role titles, organizations, dates when available, and the main responsibilities or achievements under each role.",
                "For education, extract all education, degrees, institutions, and dates when available.",
                "For certifications, extract certifications, diplomas, training, licences, and professional qualifications.",
                "For projects, extract projects, campaigns, initiatives, administrative improvements, events, systems, or portfolio work mentioned in the CV.",
                "For achievements, extract additional strengths, languages, tools, measurable accomplishments, and competencies that do not fit the other fields.",
                "For clientBrief, write one polished client-facing candidate profile brief in professional English, under 300 words, based only on the uploaded CV file. Use one coherent narrative of two to four short paragraphs. Cover experience in an orderly way, academic and certification background, core skills, and projects or achievements when available.",
                "The clientBrief must not include the candidate's full name, phone number, email address, LinkedIn URL, physical address, personal website, or any direct contact detail.",
                "Return rich but readable summary, experienceDetails, certifications, projects, education, and achievements in clear professional English, even if the CV is written in another language.",
                "Use professional business language. Do not invent employers, certifications, projects, or years of experience.",
                "If a detail is missing, return an empty string for that field."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:${mimeType};base64,${base64}`
            },
            {
              type: "input_text",
              text: "Use only the attached CV or resume as the factual source. Return the parsed CV as structured JSON."
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "urgent_recruite_cv_profile",
          strict: true,
          schema: parserSchema
        }
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || "OpenAI CV parsing failed.";
    throw new Error(message);
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("The parser returned no structured CV output.");

  return JSON.parse(outputText);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase function secrets are not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Sign in to parse CVs." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const minimumWords = Number(Deno.env.get("MINIMUM_CV_WORDS") || 200);

  let profileId = "";
  try {
    const body = await req.json();
    profileId = String(body.profileId || "");
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  if (!profileId) {
    return jsonResponse({ error: "profileId is required." }, 400);
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: "Profile was not found." }, 404);
  }

  if (!profile.cv_file_path) {
    await adminClient
      .from("profiles")
      .update({ parse_status: "failed", parser_error: "No CV file is attached." })
      .eq("id", profileId);
    return jsonResponse({ error: "No CV file is attached." }, 400);
  }

  await adminClient
    .from("profiles")
    .update({ parse_status: "processing", parser_error: null })
    .eq("id", profileId);

  try {
    const { data: fileBlob, error: fileError } = await adminClient.storage
      .from("candidate-cvs")
      .download(profile.cv_file_path);

    if (fileError || !fileBlob) {
      throw new Error("Could not download the CV file from Supabase Storage.");
    }

    const fileName = profile.cv_file_name || profile.cv_file_path.split("/").pop() || "candidate-cv.pdf";
    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    if (bytes.byteLength > 45 * 1024 * 1024) {
      throw new Error("CV file is too large to parse in one request.");
    }

    const parsed = await parseCvWithOpenAI(
      bytes,
      fileName,
      inferMimeType(fileName, fileBlob.type)
    );

    const parsedWordCount = Math.max(0, Number(parsed.wordCount || 0));
    const safeClientBrief = sanitizeClientBrief(parsed.clientBrief || parsed.summary, parsed.fullName || profile.full_name);
    const cvExcerpt = [
      safeClientBrief,
      parsed.summary,
      parsed.experienceDetails,
      parsed.certifications,
      parsed.projects,
      parsed.education,
      parsed.achievements
    ].filter(Boolean).join("\n\n").slice(0, 5000);

    const parsedFields = {
      full_name: parsed.fullName || profile.full_name,
      role: parsed.role || profile.role,
      location: parsed.location || profile.location,
      experience: parsed.experience || profile.experience,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean).slice(0, 12) : profile.skills,
      summary: parsed.summary || parsed.clientBrief || "",
      client_brief: safeClientBrief,
      word_count: parsedWordCount,
      parse_status: parsedWordCount < minimumWords ? "rejected" : "parsed",
      parsed_at: new Date().toISOString(),
      parser_error: null,
      ats_score: Math.max(0, Math.min(100, Number(parsed.atsScore || 0))),
      experience_details: parsed.experienceDetails || "",
      certifications: parsed.certifications || "",
      projects: parsed.projects || "",
      education: parsed.education || "",
      achievements: parsed.achievements || "",
      cv_text_excerpt: cvExcerpt
    };

    if (parsedWordCount < minimumWords) {
      const { error: deletedInsertError } = await adminClient.from("deleted_profiles").insert({
        full_name: parsedFields.full_name,
        email: profile.email || "",
        phone: profile.phone || "",
        linkedin: profile.linkedin || "",
        role: parsedFields.role,
        location: parsedFields.location,
        experience: parsedFields.experience,
        source: profile.source === "intent" ? "intent" : "cv",
        summary: parsedFields.summary,
        client_brief: parsedFields.client_brief,
        word_count: parsedWordCount,
        contact_details: profile.contact_details || "",
        notes: profile.notes || "",
        deletion_reason: `CV parser found fewer than ${minimumWords} words`,
        cv_file_name: profile.cv_file_name || "",
        cv_file_path: profile.cv_file_path || "",
        parse_status: "rejected",
        parser_error: null,
        ats_score: parsedFields.ats_score,
        experience_details: parsedFields.experience_details,
        certifications: parsedFields.certifications,
        projects: parsedFields.projects,
        education: parsedFields.education,
        achievements: parsedFields.achievements,
        cv_text_excerpt: parsedFields.cv_text_excerpt
      });

      if (deletedInsertError) throw deletedInsertError;

      const { error: requestDeleteError } = await adminClient.from("request_profiles").delete().eq("profile_id", profileId);
      if (requestDeleteError) throw requestDeleteError;

      const { error: profileDeleteError } = await adminClient.from("profiles").delete().eq("id", profileId);
      if (profileDeleteError) throw profileDeleteError;

      return jsonResponse({
        status: "rejected",
        profileId,
        wordCount: parsedWordCount,
        minimumWords
      });
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update(parsedFields)
      .eq("id", profileId);

    if (updateError) throw updateError;

    return jsonResponse({
      status: "parsed",
      profileId,
      wordCount: parsedWordCount,
      atsScore: parsedFields.ats_score
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CV parsing failed.";
    await adminClient
      .from("profiles")
      .update({ parse_status: "failed", parser_error: message })
      .eq("id", profileId);

    return jsonResponse({ error: message }, 500);
  }
});
