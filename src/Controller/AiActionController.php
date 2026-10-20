<?php

namespace App\Controller;

use App\Entity\Story;
use App\Entity\Chapter;
use App\Entity\Scene;
use App\Repository\StoryRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * VirtuAi — Advanced Action endpoint with full function-calling.
 * Uses OpenAI GPT-4o-mini with extended context, multi-turn reasoning,
 * and 10 creative tools for direct workspace manipulation.
 */
class AiActionController extends AbstractController
{
    public function __construct(
        private LoggerInterface $logger,
    ) {}

    private const SYSTEM_PROMPT = <<<'PROMPT'
You are **VirtuAi**, an advanced, high-performance AI creative co-creator embedded in **VirtuArts**.

═══ INTELLIGENCE & REASONING ═══
Before answering ANY request, internally:
1. Understand the TRUE GOAL behind the user's request
2. Break the problem into clear steps
3. Evaluate possible solutions
4. Choose the most optimal action and EXECUTE it immediately
Do NOT expose internal reasoning. Just deliver results.

═══ IDENTITY ═══
• Name: VirtuAi
• Role: Senior AI Creative Director & Co-Creator — NOT an assistant, NOT a chatbot
• Personality: Confident, sharp, knowledgeable, encouraging but honest
• Expertise: Visual arts, music theory, creative writing, 3D design, pixel art, color science
• Tone: Professional, concise, no filler. Use emojis sparingly (max 2 per response).

═══ ACTION HANDLING — CRITICAL ═══
1. **ALWAYS DEFAULT TO ACTION.** When a user requests something creative, USE your tools to DO IT. Never just describe.
2. **NEVER ask "would you like me to..."** — just DO IT and explain what you did.
3. **Interpret intent precisely.** "Fill the circle" = use fill_canvas_area at the circle's location. "Draw a flower" = use generate_drawing with petals, stem, leaves.
4. **Chain multiple actions** when needed. A flower = stem + leaves + petals + center.
5. **Be spatially aware.** When the user references something they drew, use the canvas context data to understand where their content is. The context provides: canvas dimensions, current tool/color, and a description of what's on canvas.
6. **Provide complete, usable outputs** — not partial answers.

═══ CANVAS AWARENESS ═══
When working in Drawing Studio, you receive canvas context:
- Canvas size (width x height in pixels)
- Current tool and color selected
- A pixel-sampled description of what's currently on the canvas

Use this context to:
- Identify WHERE the user has drawn (their shapes, colors, empty areas)
- Place YOUR drawings relative to theirs (not on top, unless asked)
- Fill, modify, or complement their existing work accurately
- Match their color scheme and style

═══ CREATIVE INTELLIGENCE ═══
🎨 COLOR: complementary, analogous, triadic harmonies. Color psychology. Art movements.
🎵 MUSIC: ii-V-I jazz, I-V-vi-IV pop, proper BPM, genre conventions.
✍️ WRITING: Hero's Journey, Three-Act structure. Show don't tell. Sensory detail.
🎮 PIXEL ART: Dithering, limited palettes (NES, Gameboy, PICO-8). Proper sprite proportions.
🧊 3D: PBR materials, three-point lighting, composition rules.

═══ DRAWING MASTERY — CRITICAL FOR generate_drawing ═══
When using generate_drawing, you are a PROFESSIONAL digital artist. Follow these rules:

**CANVAS**: 800×600 pixels. Center = (400, 300). Top-left = (0, 0).

**COORDINATE MATH — USE THIS:**
• Circle of petals around center (cx, cy) at radius R, N petals:
  For petal i: angle = (i × 360/N) × π/180
  petal_x = cx + R × cos(angle)
  petal_y = cy + R × sin(angle)
  Use filled_circle or ellipse with rotation = i × (360/N)

• Leaf shapes: Use path with 4+ points forming a leaf outline, or use two bezier curves mirrored
• Stems: Use line with lineWidth 4-8
• Organic curves: Use bezier or quadratic curves

**COMPOSITION RULES:**
1. ALWAYS compute exact coordinates. NEVER approximate blindly.
2. Use 30-80+ instructions for detailed drawings. Simple = bad. Detail = good.
3. Layer back-to-front: background first, then stems, then leaves, then petals, then center details
4. Use color variations: e.g., 3-4 shades of green for leaves, not just one #00FF00
5. Add shadows with semi-transparent darker shapes behind main elements
6. Use lineWidth 1-2 for details, 3-6 for outlines, 6-12 for thick stems

**SHAPE REFERENCE:**
• filled_circle: {type:"filled_circle", x, y, r, color} — solid circle
• circle: {type:"circle", x, y, r, color, lineWidth} — outline only
• filled_rect: {type:"filled_rect", x, y, w, h, color}
• line: {type:"line", x1, y1, x2, y2, color, lineWidth}
• ellipse: {type:"ellipse", x, y, rx, ry, rotation, fill:true, color} — for petals!
• path: {type:"path", points:[{x,y},...], close:true, fill:true, color} — for complex shapes
• bezier: {type:"bezier", x1, y1, cx1, cy1, cx2, cy2, x2, y2, color, lineWidth}
• quadratic: {type:"quadratic", x1, y1, cx, cy, x2, y2, color, lineWidth}
• text: {type:"text", x, y, text, fontSize, color}

**EXAMPLE — DAISY (compute all coords!):**
Center at (400, 300). Stem from (400, 340) to (400, 520). 
12 petals at radius 60 from center:
  petal_0: ellipse at (460, 300), rx=30, ry=12, rotation=0°
  petal_1: ellipse at (452, 330), rx=30, ry=12, rotation=30°
  ...and so on for all 12, incrementing angle by 30°.
Leaves: bezier curves branching from stem at (400, 420) curving out to (340, 390) and (460, 450).
Center: filled_circle at (400, 300), r=20, color=#FFD700, then smaller circle r=12 color=#FFA000 for depth.

ALWAYS generate 30+ instructions for any recognizable drawing. NEVER use fewer than 15.

═══ RESPONSE FORMAT ═══
• Keep text under 120 words unless detailed explanation requested.
• Use **bold** for key terms. Bullet points for lists.
• When you perform an action, briefly explain WHY you made those creative choices.
• Confident, intelligent, professional. No filler words or repetition.
PROMPT;

    private const FUNCTIONS = [
        [
            'name' => 'create_story',
            'description' => 'Create a complete new story with title, genre, and synopsis in the user\'s Story Workshop. Use this whenever the user wants to start a new writing project.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string', 'description' => 'A compelling, evocative title for the story'],
                    'genre' => ['type' => 'string', 'description' => 'Genre: Fantasy, Sci-Fi, Romance, Horror, Adventure, Mystery, Thriller, Literary Fiction, Comedy, Drama'],
                    'synopsis' => ['type' => 'string', 'description' => 'A rich, engaging synopsis (2-4 sentences) that sets up the premise, introduces the protagonist, and hints at the central conflict'],
                ],
                'required' => ['title', 'genre', 'synopsis'],
            ],
        ],
        [
            'name' => 'add_chapter',
            'description' => 'Add a new chapter to an existing story. Use this to help structure the narrative.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'story_id' => ['type' => 'integer', 'description' => 'ID of the story to add the chapter to'],
                    'title' => ['type' => 'string', 'description' => 'Title of the chapter — should be evocative and hint at the chapter\'s theme'],
                ],
                'required' => ['story_id', 'title'],
            ],
        ],
        [
            'name' => 'add_scene',
            'description' => 'Add a detailed scene to a chapter with rich, immersive content. Use this to write actual prose for the user.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'chapter_id' => ['type' => 'integer', 'description' => 'ID of the chapter'],
                    'title' => ['type' => 'string', 'description' => 'Title of the scene'],
                    'content' => ['type' => 'string', 'description' => 'The full scene content — write vivid, immersive prose with dialogue, sensory details, and emotional depth. 150-400 words.'],
                ],
                'required' => ['chapter_id', 'title', 'content'],
            ],
        ],
        [
            'name' => 'suggest_palette',
            'description' => 'Generate and APPLY a professional color palette to the user\'s canvas. Colors are injected directly into their workspace. Use color theory principles.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'theme' => ['type' => 'string', 'description' => 'Theme/mood for the palette (e.g., "Cyberpunk Neon", "Autumn Forest", "Ocean Depths")'],
                    'colors' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Array of 5-8 hex color codes. Use proper color theory — include primary, secondary, accent, and neutral tones.',
                    ],
                    'harmony' => ['type' => 'string', 'description' => 'Color harmony type used: complementary, analogous, triadic, split-complementary, tetradic, monochromatic'],
                    'description' => ['type' => 'string', 'description' => 'Brief explanation of why these colors work together and what mood they create'],
                ],
                'required' => ['theme', 'colors'],
            ],
        ],
        [
            'name' => 'suggest_progression',
            'description' => 'Suggest and APPLY a chord progression with BPM to the music workspace. The chords and BPM will be injected directly into the Beat Maker UI.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'genre' => ['type' => 'string', 'description' => 'Music genre (Pop, Jazz, Lo-Fi, EDM, Rock, Classical, R&B, Hip-Hop, Blues, Reggae, Metal, Funk)'],
                    'bpm' => ['type' => 'integer', 'description' => 'Beats per minute — use genre-appropriate ranges'],
                    'chords' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Chord names in order (e.g., Am, F, C, G). Use proper music theory.',
                    ],
                    'key' => ['type' => 'string', 'description' => 'Musical key (e.g., "C major", "A minor", "F# minor")'],
                    'description' => ['type' => 'string', 'description' => 'Description of the emotional vibe and how to use this progression'],
                    'strumming' => ['type' => 'string', 'description' => 'Suggested strumming/rhythm pattern'],
                ],
                'required' => ['genre', 'bpm', 'chords'],
            ],
        ],
        [
            'name' => 'draw_on_canvas',
            'description' => 'Draw pixels directly on the user\'s pixel art canvas. Provide pixel coordinates with colors to paint them immediately. The canvas is typically 16x16 (coords 0-15). Create recognizable shapes and patterns.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'pixels' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'x' => ['type' => 'integer', 'description' => 'X coordinate (0-based, left to right)'],
                                'y' => ['type' => 'integer', 'description' => 'Y coordinate (0-based, top to bottom)'],
                                'color' => ['type' => 'string', 'description' => 'Hex color code'],
                            ],
                        ],
                        'description' => 'Array of pixel objects to draw. For a 16x16 grid, use coords 0-15.',
                    ],
                    'description' => ['type' => 'string', 'description' => 'What is being drawn and the artistic approach used'],
                    'style' => ['type' => 'string', 'description' => 'Art style: retro, modern, minimalist, detailed, abstract'],
                ],
                'required' => ['pixels', 'description'],
            ],
        ],
        [
            'name' => 'fill_beat_pattern',
            'description' => 'Fill the Beat Maker step sequencer grid with a drum pattern. ALWAYS provide pattern data with track arrays. Each track has 16 steps (0=silent, 1=hit). YOU MUST include at least kick, snare, and hihat tracks.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'pattern' => [
                        'type' => 'object',
                        'description' => 'Beat pattern. Keys are track IDs, values are arrays of exactly 16 integers (0 or 1). You MUST use these exact track IDs: kick, snare, hihat, tom, clap, bass, synth, perc. Example: {"kick":[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],"snare":[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],"hihat":[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]}',
                        'properties' => [
                            'kick'  => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step kick pattern, e.g. [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]'],
                            'snare' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step snare pattern'],
                            'hihat' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step hi-hat pattern'],
                            'tom'   => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step tom pattern'],
                            'clap'  => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step clap pattern'],
                            'bass'  => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step bass pattern'],
                            'synth' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step synth pattern'],
                            'perc'  => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => '16-step percussion pattern'],
                        ],
                        'required' => ['kick', 'snare', 'hihat'],
                    ],
                    'bpm' => ['type' => 'integer', 'description' => 'BPM for the beat — genre-appropriate (60-180)'],
                    'name' => ['type' => 'string', 'description' => 'Name/description of the pattern'],
                    'genre' => ['type' => 'string', 'description' => 'Genre this pattern is designed for'],
                    'tips' => ['type' => 'string', 'description' => 'Tips for the user on how to layer and modify this pattern'],
                ],
                'required' => ['pattern', 'name', 'bpm'],
            ],
        ],
        [
            'name' => 'clear_canvas',
            'description' => 'Clear the entire canvas/grid to start fresh. Use when the user wants a clean slate.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'confirm' => ['type' => 'boolean', 'description' => 'Confirm clearing'],
                ],
                'required' => ['confirm'],
            ],
        ],
        [
            'name' => 'analyze_and_suggest',
            'description' => 'Provide a detailed creative analysis and 3 specific, actionable suggestions for improvement. Use when the user asks for feedback or seems stuck.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'analysis' => ['type' => 'string', 'description' => 'Brief analysis of what the user is working on'],
                    'suggestions' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => '3 specific, actionable creative suggestions',
                    ],
                    'inspiration' => ['type' => 'string', 'description' => 'Reference to a real artwork, song, or story that relates to their work'],
                ],
                'required' => ['analysis', 'suggestions'],
            ],
        ],
        [
            'name' => 'creative_challenge',
            'description' => 'Generate a timed creative challenge tailored to the current module. Gives the user a specific creative task with constraints to spark creativity.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string', 'description' => 'Catchy challenge title'],
                    'description' => ['type' => 'string', 'description' => 'Detailed challenge description with specific constraints'],
                    'difficulty' => ['type' => 'string', 'description' => 'Difficulty: Beginner, Intermediate, Advanced, Master'],
                    'time_limit' => ['type' => 'integer', 'description' => 'Suggested time in minutes'],
                    'tips' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => '2-3 tips to help the user complete the challenge',
                    ],
                ],
                'required' => ['title', 'description', 'difficulty'],
            ],
        ],
        [
            'name' => 'generate_drawing',
            'description' => 'Draw detailed artwork on the Drawing Studio canvas using Canvas2D shape instructions. Canvas is 800x600px. Center=(400,300). YOU MUST generate 30-80+ instructions for any recognizable drawing. Available shapes: filled_circle, circle, filled_rect, rect, line, ellipse (with rotation for petals!), bezier, quadratic, path (for complex shapes), text. For flowers: use ellipse with rotation for each petal around a center point, computing x/y with cos/sin. For stems: use line with lineWidth 4-8. For leaves: use path or bezier curves. ALWAYS layer back-to-front. Use multiple color shades for depth. NEVER generate fewer than 15 instructions.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'instructions' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'type' => ['type' => 'string', 'description' => 'Shape: filled_circle, circle, filled_rect, rect, line, ellipse, arc, bezier, quadratic, path, text. Use ellipse with rotation for flower petals!'],
                                'x' => ['type' => 'number', 'description' => 'X center (0-800)'],
                                'y' => ['type' => 'number', 'description' => 'Y center (0-600)'],
                                'r' => ['type' => 'number', 'description' => 'Radius for circles'],
                                'rx' => ['type' => 'number', 'description' => 'X radius for ellipse (use 25-35 for petals)'],
                                'ry' => ['type' => 'number', 'description' => 'Y radius for ellipse (use 8-14 for petals)'],
                                'w' => ['type' => 'number'], 'h' => ['type' => 'number'],
                                'x1' => ['type' => 'number'], 'y1' => ['type' => 'number'],
                                'x2' => ['type' => 'number'], 'y2' => ['type' => 'number'],
                                'cx' => ['type' => 'number'], 'cy' => ['type' => 'number'],
                                'cx1' => ['type' => 'number'], 'cy1' => ['type' => 'number'],
                                'cx2' => ['type' => 'number'], 'cy2' => ['type' => 'number'],
                                'color' => ['type' => 'string', 'description' => 'Fill color hex (e.g. #FFD700)'],
                                'strokeColor' => ['type' => 'string', 'description' => 'Stroke color hex'],
                                'lineWidth' => ['type' => 'number', 'description' => '1-12, use 4-8 for stems, 1-2 for details'],
                                'fill' => ['type' => 'boolean', 'description' => 'true to fill the shape'],
                                'close' => ['type' => 'boolean', 'description' => 'true to close a path'],
                                'stroke' => ['type' => 'boolean'],
                                'rotation' => ['type' => 'number', 'description' => 'Rotation in DEGREES for ellipse. Critical for petals: petal_i rotation = i*(360/N)'],
                                'points' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['x' => ['type' => 'number'], 'y' => ['type' => 'number']]], 'description' => 'Points array for path shapes'],
                                'text' => ['type' => 'string'], 'fontSize' => ['type' => 'number'],
                            ],
                        ],
                        'description' => 'Array of 30-80+ drawing instructions. Each is a shape to render on canvas. Layer back-to-front. Use trig (cos/sin) to compute petal positions around a center.',
                    ],
                    'description' => ['type' => 'string', 'description' => 'What is being drawn and the artistic approach'],
                ],
                'required' => ['instructions', 'description'],
            ],
        ],
        [
            'name' => 'fill_canvas_area',
            'description' => 'Flood-fill an area on the Drawing Studio canvas at the given x,y coordinates with the specified color. Use this when the user asks to "fill" something they drew (e.g. "fill the circle", "color it blue"). The fill spreads from the x,y point outward, filling all connected pixels of the same color.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'x' => ['type' => 'number', 'description' => 'X coordinate to start the fill from (center of the area to fill)'],
                    'y' => ['type' => 'number', 'description' => 'Y coordinate to start the fill from (center of the area to fill)'],
                    'color' => ['type' => 'string', 'description' => 'Hex color to fill with (e.g. #3b82f6 for blue)'],
                ],
                'required' => ['x', 'y', 'color'],
            ],
        ],
        [
            'name' => 'add_3d_shape',
            'description' => 'Add a 3D shape to the Three.js scene. Use this when the user asks to create/add/build 3D objects.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'shape' => ['type' => 'string', 'description' => 'Shape: cube, sphere, cylinder, cone, torus, torusknot, icosahedron, octahedron, dodecahedron, capsule, plane, ring'],
                    'color' => ['type' => 'string', 'description' => 'Hex color for the shape'],
                    'material' => ['type' => 'string', 'description' => 'Material: standard, phong, toon, wireframe, glass, metal, emissive, normal'],
                    'name' => ['type' => 'string', 'description' => 'Display name for the object'],
                    'position' => ['type' => 'object', 'properties' => ['x' => ['type' => 'number'], 'y' => ['type' => 'number'], 'z' => ['type' => 'number']]],
                    'scale' => ['type' => 'object', 'properties' => ['x' => ['type' => 'number'], 'y' => ['type' => 'number'], 'z' => ['type' => 'number']]],
                ],
                'required' => ['shape'],
            ],
        ],
        [
            'name' => 'set_3d_environment',
            'description' => 'Change the 3D scene environment preset.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'environment' => ['type' => 'string', 'description' => 'Preset: void, studio, sunset, midnight, arena'],
                ],
                'required' => ['environment'],
            ],
        ],
        [
            'name' => 'set_3d_lighting',
            'description' => 'Adjust 3D scene lighting settings.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'ambientIntensity' => ['type' => 'number', 'description' => '0-2'],
                    'ambientColor' => ['type' => 'string'],
                    'dirIntensity' => ['type' => 'number', 'description' => '0-3'],
                    'dirColor' => ['type' => 'string'],
                ],
                'required' => [],
            ],
        ],
        [
            'name' => 'draw_artwork',
            'description' => 'Draw a detailed, beautiful artwork on the Drawing Studio canvas using the PARAMETRIC TEMPLATE ENGINE. This is the PREFERRED tool for drawing — it produces 40-100+ shapes with proper math. Supported subjects: flower, daisy, rose, sunflower, tulip, lotus, tree, oak, pine, heart, star, sun, house, cabin, butterfly. You can customize all colors, size, position, and petal count. ALWAYS use this instead of generate_drawing when drawing recognizable objects.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'subject' => ['type' => 'string', 'description' => 'What to draw: flower, daisy, rose, sunflower, tulip, tree, oak, heart, star, sun, house, cabin, butterfly, lotus'],
                    'centerX' => ['type' => 'number', 'description' => 'X center position on 800px wide canvas (default 400)'],
                    'centerY' => ['type' => 'number', 'description' => 'Y center position on 600px tall canvas (default 280)'],
                    'size' => ['type' => 'number', 'description' => 'Scale factor: 0.5=small, 1.0=normal, 1.5=large, 2.0=extra large'],
                    'petalCount' => ['type' => 'integer', 'description' => 'Number of petals for flowers (default 12)'],
                    'petalColor' => ['type' => 'string', 'description' => 'Hex color for petals (e.g. #FFFFFF for white, #FFC0CB for pink)'],
                    'centerColor' => ['type' => 'string', 'description' => 'Hex color for flower center (e.g. #FFD700 for golden)'],
                    'stemColor' => ['type' => 'string', 'description' => 'Hex color for stem (e.g. #2E7D32 for green)'],
                    'leafColor' => ['type' => 'string', 'description' => 'Hex color for leaves (e.g. #388E3C)'],
                    'color' => ['type' => 'string', 'description' => 'Main color for hearts, stars, suns'],
                    'wallColor' => ['type' => 'string', 'description' => 'Wall color for houses'],
                    'roofColor' => ['type' => 'string', 'description' => 'Roof color for houses'],
                    'wingColor1' => ['type' => 'string', 'description' => 'Primary wing color for butterflies'],
                    'wingColor2' => ['type' => 'string', 'description' => 'Secondary wing color for butterflies'],
                ],
                'required' => ['subject'],
            ],
        ],
    ];

    #[Route('/api/ai/action', name: 'api_ai_action', methods: ['POST'])]
    public function action(
        Request                $request,
        HttpClientInterface    $httpClient,
        EntityManagerInterface $em,
        StoryRepository        $storyRepo,
        GamificationService    $gamification
    ): JsonResponse {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);
        $userMessage = trim($data['message'] ?? '');
        $module = $data['module'] ?? 'general';
        $context = $data['context'] ?? [];
        $conversationHistory = $data['history'] ?? [];

        if ($userMessage === '') {
            return new JsonResponse(['error' => 'Please type a message.'], 400);
        }

        $apiKey = $this->getParameter('app.openai_api_key');

        // Build context-aware system prompt with module-specific intelligence
        $moduleHints = match ($module) {
            'pixel_art' => "\n\n🎮 PIXEL ART CONTEXT: The user is in the Pixel Art editor. Grid is 16x16 (coords 0-15). When they ask you to draw ANYTHING, you MUST use draw_on_canvas with pixel coordinates. Create recognizable pixel art. Use suggest_palette for color requests.",
            'drawing' => "\n\n🎨 DRAWING STUDIO CONTEXT: The user is in the Drawing Studio with a FREEFORM canvas.\n\n⚠️ CRITICAL RULES:\n- For known subjects (flower, daisy, rose, tree, heart, star, sun, house, butterfly) → use draw_artwork (PREFERRED — produces 40-100+ shapes!)\n- For custom/abstract drawings → use generate_drawing with Canvas2D instructions (30+ shapes minimum)\n- When the user asks to COMPLETE a shape → READ the shape detection data below, then use generate_drawing to redraw the complete shape at the DETECTED center and radius, using the SAME color found on canvas\n- When the user asks to FILL something → use fill_canvas_area at the DETECTED center coordinates\n- When the user says 'complete and fill' → FIRST generate_drawing a complete shape, THEN fill_canvas_area at center\n- When the user asks for colors/palette → use suggest_palette\n- When the user asks to clear → use clear_canvas\n\nCanvas is approximately 800x600 pixels. Shape detection data below tells you what shape the user drew, its center, and radius. USE THESE EXACT COORDINATES.",
            'music' => "\n\n🎵 BEAT MAKER CONTEXT: The user is in the Beat Maker with an 8-track step sequencer (16 steps per track).\n\n⚠️ CRITICAL RULES:\n- When the user asks for ANY beat, groove, rhythm, or pattern → you MUST call fill_beat_pattern with FULL pattern arrays\n- NEVER just describe a pattern in text — ALWAYS use the fill_beat_pattern function to load it into the grid\n- Each pattern value MUST be an array of exactly 16 integers (0 or 1)\n- You MUST include at minimum: kick, snare, hihat tracks\n- Track IDs: kick, snare, hihat, tom, clap, bass, synth, perc\n- Always set an appropriate BPM for the genre\n- Use suggest_progression for chord/harmony requests\n\nGenre BPM reference: Lo-Fi=75, Hip-Hop=90, Pop=120, House=128, Techno=130, DnB=170, Trap=140",
            'story' => "\n\n✍️ STORYTELLER CONTEXT: The user is in the Story Workshop. Use create_story, add_chapter, add_scene to BUILD content directly. Write vivid prose with dialogue and sensory details.",
            '3d_studio', 'shapes_3d' => "\n\n🧊 3D BUILDER CONTEXT: The user is in the 3D Creation Studio (Three.js). When they ask to build/create/add shapes, ALWAYS use add_3d_shape. Available shapes: cube, sphere, cylinder, cone, torus, torusknot, icosahedron, octahedron, dodecahedron, capsule, plane, ring. Materials: standard, phong, toon, wireframe, glass, metal, emissive, normal. Use set_3d_environment to change the scene (void, studio, sunset, midnight, arena). Use set_3d_lighting to adjust lights. Use suggest_palette for material color themes. You can chain multiple add_3d_shape calls to build complex scenes.",
            default => '',
        };

        $contextInfo = '';
        if (!empty($context)) {
            // Build structured canvas context for Drawing Studio
            if ($module === 'drawing' && isset($context['canvas'])) {
                $c = $context['canvas'];
                $contextInfo = "\n\n═══ CANVAS STATE ═══";
                $contextInfo .= "\nCanvas size: {$c['width']}x{$c['height']} pixels";
                $contextInfo .= "\nCurrent tool: " . ($c['currentTool'] ?? 'brush');
                $contextInfo .= "\nCurrent color: " . ($c['currentColor'] ?? '#000000');
                $contextInfo .= "\nHas content: " . ($c['hasContent'] ? 'YES' : 'NO (empty canvas)');
                if ($c['hasContent'] ?? false) {
                    $contextInfo .= "\nContent density: {$c['contentDensity']}% of canvas has drawn content";
                    $colors = implode(', ', $c['colorsUsed'] ?? []);
                    $contextInfo .= "\nColors on canvas: {$colors}";

                    // Shape detection results
                    if (!empty($c['shapeHint'])) {
                        $sh = $c['shapeHint'];
                        $contextInfo .= "\n\n═══ SHAPE DETECTION ═══";
                        $contextInfo .= "\nDetected shape: " . ($sh['likelyShape'] ?? 'unknown') . " (confidence: " . ($sh['confidence'] ?? 'low') . ")";
                        $contextInfo .= "\nShape center: (" . ($sh['centerX'] ?? 0) . ", " . ($sh['centerY'] ?? 0) . ")";
                        $contextInfo .= "\nAverage radius: " . ($sh['avgRadius'] ?? 0) . "px";
                        if (!empty($sh['boundingBox'])) {
                            $bb = $sh['boundingBox'];
                            $contextInfo .= "\nBounding box: x={$bb['x']}, y={$bb['y']}, w={$bb['w']}, h={$bb['h']}";
                        }
                        $contextInfo .= "\n\n⚠️ CRITICAL — SHAPE INTERACTION RULES:";
                        $contextInfo .= "\n• \"Complete the circle\" → use generate_drawing with a circle (NOT filled_circle) at center (" . ($sh['centerX'] ?? 0) . ", " . ($sh['centerY'] ?? 0) . ") with radius " . ($sh['avgRadius'] ?? 50) . " using the SAME color as on canvas ({$colors}). Use lineWidth matching the original stroke.";
                        $contextInfo .= "\n• \"Fill it with [color]\" → use fill_canvas_area at center (" . ($sh['centerX'] ?? 0) . ", " . ($sh['centerY'] ?? 0) . ") with THE COLOR THE USER ASKED FOR (e.g. blue=#3b82f6, red=#ef4444, green=#22c55e). Do NOT use the canvas color.";
                        $contextInfo .= "\n• \"Complete and fill with [color]\" → TWO steps: 1) generate_drawing with a filled_circle at center (" . ($sh['centerX'] ?? 0) . ", " . ($sh['centerY'] ?? 0) . ") radius " . ($sh['avgRadius'] ?? 50) . " with THE USER'S REQUESTED FILL COLOR, 2) then ALSO draw a circle outline on top with the original canvas color ({$colors}).";
                        $contextInfo .= "\n• \"Draw next to it\" → place new drawing offset from bounding box edges";
                    } else if (!empty($c['sampleRegions'])) {
                        $avgX = array_sum(array_column($c['sampleRegions'], 'x')) / count($c['sampleRegions']);
                        $avgY = array_sum(array_column($c['sampleRegions'], 'y')) / count($c['sampleRegions']);
                        $contextInfo .= "\nApproximate center of drawn content: (" . round($avgX) . ", " . round($avgY) . ")";
                        $contextInfo .= "\n\n⚠️ IMPORTANT: When filling, use fill_canvas_area at (" . round($avgX) . ", " . round($avgY) . ").";
                    }
                }
            } elseif (($module === '3d_studio' || $module === 'shapes_3d') && isset($context['scene_objects'])) {
                $contextInfo = "\n\n═══ 3D SCENE STATE ═══\nObjects in scene: " . count($context['scene_objects']);
                foreach ($context['scene_objects'] as $obj) {
                    $contextInfo .= "\n  - {$obj['name']} ({$obj['shapeType']}, color: {$obj['color']}, material: {$obj['materialType']})";
                }
            } elseif ($module === 'music' && isset($context['beat_state'])) {
                $bs = $context['beat_state'];
                $contextInfo = "\n\n═══ BEAT MAKER STATE ═══";
                $contextInfo .= "\nCurrent BPM: " . ($bs['bpm'] ?? 120);
                $contextInfo .= "\nSwing: " . ($bs['swing'] ?? 0) . "%";
                $contextInfo .= "\nAvailable tracks: " . implode(', ', $bs['trackIds'] ?? []);
                $activeTracks = $bs['activeTracks'] ?? [];
                if (count($activeTracks) > 0) {
                    $contextInfo .= "\nTracks with active patterns: " . implode(', ', $activeTracks);
                } else {
                    $contextInfo .= "\nGrid is EMPTY — no patterns loaded yet";
                }
            } else {
                $contextInfo = "\n\nWorkspace context: " . json_encode($context);
            }
        }

        // Build messages with conversation history for multi-turn intelligence
        $messages = [
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT . $moduleHints . $contextInfo],
        ];

        // Extended memory — last 16 turns for deep co-worker context
        foreach (array_slice($conversationHistory, -16) as $h) {
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
                    'model'         => 'gpt-4o',
                    'messages'      => $messages,
                    'functions'     => self::FUNCTIONS,
                    'function_call' => 'auto',
                    'max_tokens'    => 4000,
                    'temperature'   => 0.7,
                    'top_p'         => 0.92,
                    'presence_penalty'  => 0.4,
                    'frequency_penalty' => 0.25,
                ],
            ]);

            $body = $response->toArray();
            $choice = $body['choices'][0] ?? null;

            if (!$choice) {
                return new JsonResponse(['reply' => "I'm drawing a blank — please try again!"]);
            }

            $message = $choice['message'] ?? [];

            // Function call detected
            if (isset($message['function_call'])) {
                $funcName = $message['function_call']['name'];
                $funcArgs = json_decode($message['function_call']['arguments'] ?? '{}', true);

                $this->logger->info('VirtuAi action executed', [
                    'function' => $funcName,
                    'module' => $module,
                    'user' => $this->getUser()->getUserIdentifier(),
                ]);

                $result = $this->executeAction($funcName, $funcArgs, $em, $storyRepo, $gamification);

                return new JsonResponse([
                    'action' => $funcName,
                    'result' => $result,
                    'reply'  => $result['message'] ?? 'Done!',
                ]);
            }

            // Regular text response
            return new JsonResponse([
                'reply' => $message['content'] ?? "I'm drawing a blank — please try again!",
            ]);

        } catch (\Exception $e) {
            $this->logger->error('VirtuAi error', ['error' => $e->getMessage(), 'module' => $module]);
            return new JsonResponse([
                'error' => 'Creative block! Something went wrong. (' . $e->getMessage() . ')',
            ], 500);
        }
    }

    /**
     * Execute a function call from the AI — maps to concrete workspace actions.
     */
    private function executeAction(
        string                 $funcName,
        array                  $args,
        EntityManagerInterface $em,
        StoryRepository        $storyRepo,
        GamificationService    $gamification
    ): array {
        $user = $this->getUser();

        return match ($funcName) {
            'create_story' => $this->createStory($args, $em, $gamification, $user),
            'add_chapter'  => $this->addChapter($args, $em, $storyRepo, $gamification, $user),
            'add_scene'    => $this->addScene($args, $em, $gamification, $user),
            'suggest_palette' => [
                'success' => true,
                'type'    => 'palette',
                'theme'   => $args['theme'] ?? 'Custom',
                'colors'  => $args['colors'] ?? [],
                'harmony' => $args['harmony'] ?? '',
                'description' => $args['description'] ?? '',
                'message' => '🎨 ' . ($args['theme'] ?? 'Custom') . ' palette applied! ' . ($args['description'] ?? ''),
            ],
            'suggest_progression' => [
                'success' => true,
                'type'    => 'progression',
                'genre'   => $args['genre'] ?? 'General',
                'bpm'     => $args['bpm'] ?? 120,
                'chords'  => $args['chords'] ?? [],
                'key'     => $args['key'] ?? '',
                'description' => $args['description'] ?? '',
                'strumming' => $args['strumming'] ?? '',
                'message' => '🎵 ' . ($args['genre'] ?? 'Custom') . ' progression in ' . ($args['key'] ?? 'unknown key') . ' at ' . ($args['bpm'] ?? 120) . ' BPM!',
            ],
            'draw_on_canvas' => [
                'success'     => true,
                'type'        => 'draw_pixels',
                'pixels'      => $args['pixels'] ?? [],
                'description' => $args['description'] ?? 'Drawing',
                'style'       => $args['style'] ?? '',
                'message'     => '🎨 Drawing "' . ($args['description'] ?? 'artwork') . '" on your canvas!',
            ],
            'fill_beat_pattern' => [
                'success' => true,
                'type'    => 'beat_pattern',
                'pattern' => $args['pattern'] ?? [],
                'bpm'     => $args['bpm'] ?? null,
                'name'    => $args['name'] ?? 'Custom Beat',
                'genre'   => $args['genre'] ?? '',
                'tips'    => $args['tips'] ?? '',
                'message' => '🥁 Loaded "' . ($args['name'] ?? 'Custom Beat') . '"! ' . ($args['tips'] ?? ''),
            ],
            'clear_canvas' => [
                'success' => true,
                'type'    => 'clear_canvas',
                'message' => '🧹 Canvas cleared! Fresh start — the blank canvas is full of possibilities.',
            ],
            'analyze_and_suggest' => [
                'success'     => true,
                'type'        => 'analysis',
                'analysis'    => $args['analysis'] ?? '',
                'suggestions' => $args['suggestions'] ?? [],
                'inspiration' => $args['inspiration'] ?? '',
                'message'     => '💡 Here\'s my creative analysis with suggestions!',
            ],
            'creative_challenge' => [
                'success'     => true,
                'type'        => 'challenge',
                'title'       => $args['title'] ?? 'Creative Challenge',
                'description' => $args['description'] ?? '',
                'difficulty'  => $args['difficulty'] ?? 'Intermediate',
                'time_limit'  => $args['time_limit'] ?? 15,
                'tips'        => $args['tips'] ?? [],
                'message'     => '🏆 Challenge accepted! "' . ($args['title'] ?? 'Creative Challenge') . '"',
            ],
            'generate_drawing' => [
                'success'      => true,
                'type'         => 'drawing_generated',
                'instructions' => $args['instructions'] ?? [],
                'description'  => $args['description'] ?? 'Artwork',
                'message'      => '🎨 Drawing "' . ($args['description'] ?? 'artwork') . '" on your canvas!',
            ],
            'fill_canvas_area' => [
                'success' => true,
                'type'    => 'canvas_fill',
                'x'       => $args['x'] ?? 400,
                'y'       => $args['y'] ?? 300,
                'color'   => $args['color'] ?? '#3b82f6',
                'message' => '🎨 Filling area at (' . ($args['x'] ?? 400) . ', ' . ($args['y'] ?? 300) . ') with ' . ($args['color'] ?? '#3b82f6'),
            ],
            'add_3d_shape' => [
                'success'  => true,
                'type'     => '3d_shape_added',
                'shape'    => $args['shape'] ?? 'cube',
                'color'    => $args['color'] ?? '#f97316',
                'material' => $args['material'] ?? 'standard',
                'name'     => $args['name'] ?? null,
                'position' => $args['position'] ?? null,
                'scale'    => $args['scale'] ?? null,
                'message'  => '🧊 Added ' . ($args['name'] ?? $args['shape'] ?? 'shape') . ' to the scene!',
            ],
            'set_3d_environment' => [
                'success'     => true,
                'type'        => '3d_environment',
                'environment' => $args['environment'] ?? 'void',
                'message'     => '🌍 Environment set to ' . ($args['environment'] ?? 'void') . '!',
            ],
            'set_3d_lighting' => [
                'success'          => true,
                'type'             => '3d_lighting',
                'ambientIntensity' => $args['ambientIntensity'] ?? null,
                'ambientColor'     => $args['ambientColor'] ?? null,
                'dirIntensity'     => $args['dirIntensity'] ?? null,
                'dirColor'         => $args['dirColor'] ?? null,
                'message'          => '💡 Lighting updated!',
            ],
            'draw_artwork' => [
                'success'  => true,
                'type'     => 'artwork_generated',
                'subject'  => $args['subject'] ?? 'flower',
                'params'   => $args,
                'message'  => '🎨 Drawing a beautiful ' . ($args['subject'] ?? 'artwork') . ' on your canvas!',
            ],
            default => ['success' => false, 'message' => 'Unknown action: ' . $funcName],
        };
    }

    private function createStory(array $args, EntityManagerInterface $em, GamificationService $gamification, $user): array
    {
        $story = new Story();
        $story->setTitle($args['title'] ?? 'Untitled Story');
        $story->setGenre($args['genre'] ?? null);
        $story->setContent($args['synopsis'] ?? '');
        $story->setStatus('DRAFT');
        $em->persist($story);
        $em->flush();

        $gamification->award($user, GamificationService::CREATE_STORY);

        return [
            'success'  => true,
            'type'     => 'story_created',
            'story_id' => $story->getId(),
            'title'    => $story->getTitle(),
            'message'  => '✨ Created "' . $story->getTitle() . '" (' . $story->getGenre() . '). Your story awaits in the Story Workshop!',
        ];
    }

    private function addChapter(array $args, EntityManagerInterface $em, StoryRepository $storyRepo, GamificationService $gamification, $user): array
    {
        $storyId = $args['story_id'] ?? 0;
        $story = $storyRepo->find($storyId);
        if (!$story) {
            return ['success' => false, 'message' => 'Story #' . $storyId . ' not found. Tell me which story to add the chapter to.'];
        }

        $chapter = new Chapter();
        $chapter->setTitle($args['title'] ?? 'New Chapter');
        $chapter->setStory($story);
        $chapter->setOrderIndex($story->getChapters()->count() + 1);
        $em->persist($chapter);
        $em->flush();

        $gamification->award($user, GamificationService::ADD_CHAPTER);

        return [
            'success'    => true,
            'type'       => 'chapter_added',
            'chapter_id' => $chapter->getId(),
            'story_id'   => $story->getId(),
            'title'      => $chapter->getTitle(),
            'message'    => '📖 Added "' . $chapter->getTitle() . '" to "' . $story->getTitle() . '"!',
        ];
    }

    private function addScene(array $args, EntityManagerInterface $em, GamificationService $gamification, $user): array
    {
        $chapterId = $args['chapter_id'] ?? 0;
        $chapter = $em->getRepository(Chapter::class)->find($chapterId);
        if (!$chapter) {
            return ['success' => false, 'message' => 'Chapter #' . $chapterId . ' not found.'];
        }

        $scene = new Scene();
        $scene->setTitle($args['title'] ?? 'New Scene');
        $scene->setContent($args['content'] ?? '');
        $scene->setChapter($chapter);
        $em->persist($scene);
        $em->flush();

        $gamification->award($user, GamificationService::ADD_SCENE);

        return [
            'success'  => true,
            'type'     => 'scene_added',
            'scene_id' => $scene->getId(),
            'title'    => $scene->getTitle(),
            'message'  => '🎬 Added scene "' . $scene->getTitle() . '" to "' . $chapter->getTitle() . '"!',
        ];
    }
}
