<?php

namespace App\Controller;

use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * VirtuAi — Advanced context-aware streaming chat with deep creative expertise.
 * Supports multi-turn conversation memory, module-specific intelligence,
 * and detailed creative knowledge across all VirtuArts domains.
 */
class AiChatController extends AbstractController
{
    public function __construct(
        private LoggerInterface $logger,
    ) {}

    /* ═══════════════════════════════════════
       SYSTEM PROMPTS — deeply specialized per module
    ═══════════════════════════════════════ */

    private const BASE_PROMPT = <<<'PROMPT'
You are **VirtuAi**, an advanced, high-performance AI Creative Director embedded in **VirtuArts** — a virtual youth arts platform.

═══ INTELLIGENCE & REASONING ═══
Before answering ANY request, internally:
1. Understand the TRUE GOAL behind the user's request
2. Break the problem into clear steps
3. Evaluate possible solutions
4. Choose the most optimal action and EXECUTE it immediately
Do NOT expose internal reasoning. Just deliver results.

═══ IDENTITY ═══
• Name: VirtuAi
• Role: Senior Creative Director & Co-Creator — NOT an assistant, NOT a chatbot
• Personality: Confident, sharp, knowledgeable, encouraging but honest
• Expertise: Visual arts, music theory, creative writing, 3D design, pixel art, color science
• Tone: Professional, concise, no filler. Use emojis sparingly (max 2 per response).

═══ ACTION HANDLING ═══
1. **ACT, DON'T ADVISE.** Use your tools to DO IT. Never say "you should" when you can say "I just did."
2. **Interpret intent precisely.** Understand what the user truly wants, then execute.
3. **Be opinionated.** Say "This works better because..." not "You might consider..."
4. **Anticipate next steps.** After completing a task, suggest what to do next.
5. **Teach through action.** Explain WHY you made creative choices.

═══ CREATIVE EXPERTISE ═══
🎨 Color: harmonies, psychology, art movements (Impressionism→Cyberpunk), composition rules
🎵 Music: progressions (ii-V-I jazz, I-V-vi-IV pop), tempo ranges, beat construction, song structure
✍️ Writing: Three-Act, Hero's Journey, character arcs, show don't tell, sensory detail
🎮 Pixel Art: dithering, limited palettes (NES/Gameboy/PICO-8), sprite proportions
🧊 3D: PBR materials, three-point lighting, composition, CSG booleans

═══ RESPONSE FORMAT ═══
• Keep text under 120 words unless detailed explanation requested.
• Use **bold** for key terms. Be concise but insightful.
• Confident, intelligent, professional. No filler words or repetition.
PROMPT;

    private const MODULE_PROMPTS = [

        'shapes_3d' => <<<'PROMPT'
🧊 **3D CREATION STUDIO CONTEXT**
The user is building 3D scenes with Three.js (12 primitives, PBR materials, CSG booleans, animations).

**You CAN directly control the 3D scene!** Use these functions:
- add_3d_shape: Add shapes (cube, sphere, cylinder, cone, torus, torusknot, icosahedron, octahedron, dodecahedron, capsule, plane, ring) with color, material, position, scale
- set_3d_environment: Change scene preset (void, studio, sunset, midnight, arena)
- set_3d_lighting: Adjust ambient/directional light intensity and color
- suggest_palette: Inject material color themes

Chain multiple add_3d_shape calls to build complex scenes. Suggest materials (standard, phong, toon, wireframe, glass, metal, emissive, normal).
PROMPT,

        'drawing' => <<<'PROMPT'
🎨 **DRAWING STUDIO CONTEXT**
The user is creating digital drawings on a freeform canvas (~800x600 pixels).

**You CAN draw on this canvas using the generate_drawing function!** When the user asks you to draw anything (flower, house, tree, heart, star, sun, animal, etc.), use generate_drawing with Canvas2D instructions.

Available instruction types: filled_circle, circle, filled_rect, rect, line, ellipse, bezier, quadratic, path, text.
Center drawings around (400, 300). Compose artwork from basic shapes.

Also use suggest_palette for color palettes, clear_canvas to reset, analyze_and_suggest for feedback.
Guide composition, technique, and color theory while ALSO drawing for them.
PROMPT,

        'pixel_art' => <<<'PROMPT'
🎮 **PIXEL ART EDITOR CONTEXT**
The user is on a 16x16 pixel art grid. You can draw directly using draw_on_canvas.

**Your Focus:**
- When they ask you to draw ANYTHING, use draw_on_canvas with actual pixel coordinates
- Use retro-appropriate palettes: Gameboy (4 shades of green), NES, PICO-8
- Apply proper pixel art techniques: clean outlines, dithering for gradients, limited palette discipline
- For a 16x16 grid: start with the silhouette, then add details and shading
- Always push a matching palette with suggest_palette after drawing
PROMPT,

        'music' => <<<'PROMPT'
🎵 **MUSIC STUDIO CONTEXT**
The user has a Beat Maker (step sequencer) and Acoustic instruments (piano, guitar, drums).

**Your Focus:**
- Use fill_beat_pattern to create complete, genre-authentic drum patterns
- Use suggest_progression for theory-correct chord sequences with proper key and BPM
- Explain WHY certain rhythms and chords work: "The syncopated kick on the 'and' of 3 creates tension"
- Teach music theory through action: show don't tell
- Reference specific songs as examples: "This pattern is inspired by the Billie Jean groove"
- Track IDs: kick, snare, hihat, tom, clap, bass, synth, perc
PROMPT,

        'story' => <<<'PROMPT'
✍️ **STORY WORKSHOP CONTEXT**
The user is writing stories with chapters and scenes. You can create content directly in their database.

**Your Focus:**
- Use create_story to build new projects with compelling titles, genres, and rich synopses
- Use add_chapter with thematic, evocative titles that hint at the chapter's purpose
- Use add_scene to write vivid, immersive prose (150-400 words) with dialogue, sensory details, and emotion
- Apply narrative craft: show don't tell, strong verbs, varied sentence rhythm
- Guide story structure: "Your first act should establish the world, the character's desire, and the obstacle"
- Help with character development, plot twists, worldbuilding, and dialogue
PROMPT,

        'general' => <<<'PROMPT'
✨ **GENERAL CONTEXT**
The user is on the VirtuArts platform. You can create stories, suggest music, generate palettes, and more from anywhere.

**Your Focus:**
- Help the user discover which module best fits their creative mood
- Suggest cross-module creative projects: "Draw a character, write their story, and compose their theme song"
- Use your actions proactively when the conversation leads to a creative opportunity
- Be an inspiring creative mentor who pushes the user to try new things
PROMPT,
    ];

    /* ═══════════════════════════════════════
       FULL-PAGE CHAT VIEW
    ═══════════════════════════════════════ */

    #[Route('/ai/chat', name: 'app_ai_chat')]
    public function chatPage(): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        return $this->render('ai/chat.html.twig');
    }

    /* ═══════════════════════════════════════
       STANDARD CHAT ENDPOINT (JSON)
    ═══════════════════════════════════════ */

    #[Route('/api/ai/chat', name: 'api_ai_chat', methods: ['POST'])]
    public function chat(Request $request, HttpClientInterface $httpClient): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);
        $userMessage = trim($data['message'] ?? '');
        $module = $data['module'] ?? 'general';
        $history = $data['history'] ?? [];

        if ($userMessage === '') {
            return new JsonResponse(['error' => 'Please type a message.'], 400);
        }

        $apiKey = $this->getParameter('app.openai_api_key');
        // Normalize module aliases
        if ($module === '3d_studio') $module = 'shapes_3d';
        $systemPrompt = self::BASE_PROMPT . "\n\n" . (self::MODULE_PROMPTS[$module] ?? self::MODULE_PROMPTS['general']);

        // Build messages with conversation memory
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        // Extended memory — last 16 turns for deep context continuity
        foreach (array_slice($history, -16) as $h) {
            $messages[] = ['role' => $h['role'] ?? 'user', 'content' => $h['content'] ?? ''];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        try {
            $response = $httpClient->request('POST', 'https://api.openai.com/v1/chat/completions', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'model'       => 'gpt-4o',
                    'messages'    => $messages,
                    'max_tokens'  => 1500,
                    'temperature' => 0.85,
                    'top_p'       => 0.92,
                    'presence_penalty'  => 0.4,
                    'frequency_penalty' => 0.25,
                ],
            ]);

            $body = $response->toArray();
            $reply = $body['choices'][0]['message']['content'] ?? "I'm drawing a blank — please try again!";

            return new JsonResponse(['reply' => $reply]);

        } catch (\Exception $e) {
            $this->logger->error('VirtuAi chat error', ['error' => $e->getMessage()]);
            return new JsonResponse([
                'error' => 'Creative block! Something went wrong. (' . $e->getMessage() . ')',
            ], 500);
        }
    }

    /* ═══════════════════════════════════════
       STREAMING CHAT (SSE) — real-time typing
    ═══════════════════════════════════════ */

    #[Route('/api/ai/chat/stream', name: 'api_ai_chat_stream', methods: ['POST'])]
    public function chatStream(Request $request, HttpClientInterface $httpClient): StreamedResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);
        $userMessage = trim($data['message'] ?? '');
        $module = $data['module'] ?? 'general';
        $history = $data['history'] ?? [];

        $apiKey = $this->getParameter('app.openai_api_key');
        $systemPrompt = self::BASE_PROMPT . "\n\n" . (self::MODULE_PROMPTS[$module] ?? self::MODULE_PROMPTS['general']);

        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        // Extended memory — last 16 turns for deep context continuity
        foreach (array_slice($history, -16) as $h) {
            $messages[] = ['role' => $h['role'] ?? 'user', 'content' => $h['content'] ?? ''];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        return new StreamedResponse(function () use ($httpClient, $apiKey, $messages) {
            try {
                $response = $httpClient->request('POST', 'https://api.openai.com/v1/chat/completions', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $apiKey,
                        'Content-Type'  => 'application/json',
                    ],
                    'json' => [
                        'model'       => 'gpt-4o',
                        'messages'    => $messages,
                        'max_tokens'  => 1500,
                        'temperature' => 0.85,
                        'top_p'       => 0.92,
                        'presence_penalty'  => 0.4,
                        'frequency_penalty' => 0.25,
                        'stream'      => true,
                    ],
                ]);

                foreach ($httpClient->stream($response) as $chunk) {
                    $content = $chunk->getContent();
                    if ($content === '') continue;

                    foreach (explode("\n", $content) as $line) {
                        $line = trim($line);
                        if ($line === '' || $line === 'data: [DONE]') continue;
                        if (str_starts_with($line, 'data: ')) {
                            $json = json_decode(substr($line, 6), true);
                            $delta = $json['choices'][0]['delta']['content'] ?? '';
                            if ($delta !== '') {
                                echo "data: " . json_encode(['content' => $delta]) . "\n\n";
                                if (ob_get_level()) ob_flush();
                                flush();
                            }
                        }
                    }
                }

                echo "data: [DONE]\n\n";
                if (ob_get_level()) ob_flush();
                flush();

            } catch (\Exception $e) {
                echo "data: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
                if (ob_get_level()) ob_flush();
                flush();
            }
        }, 200, [
            'Content-Type'  => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection'    => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
