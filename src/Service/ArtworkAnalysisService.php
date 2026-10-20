<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * AI-powered artwork analysis service.
 * Uses OpenAI Vision API to evaluate museum submissions and determine
 * if artwork should be auto-approved (colorful/beautiful or clean/simple).
 */
class ArtworkAnalysisService
{
    private const ANALYSIS_PROMPT = <<<'PROMPT'
You are an art curator AI for VirtuArts, an online art platform. Analyze this artwork image and determine if it should be automatically approved for the museum gallery.

APPROVAL CRITERIA (approve if ANY of these are true):
1. **Colorful & Beautiful**: The artwork uses vibrant, harmonious colors and demonstrates artistic effort
2. **Clean & Simple**: The artwork has a clean, minimalist aesthetic with intentional simplicity
3. **Creative & Expressive**: The artwork shows genuine creative expression or artistic vision

REJECTION CRITERIA (reject if ANY of these are true):
1. The image is blank, mostly empty, or contains random scribbles with no artistic intent
2. The image contains inappropriate or offensive content
3. The image is clearly a test/placeholder with no real artwork

Respond with ONLY a valid JSON object (no markdown, no code fences):
{"approved": true/false, "reason": "Brief 1-sentence explanation", "score": 1-10}

Where score is: 1-3 = poor quality, 4-6 = decent, 7-10 = excellent.
Auto-approve if score >= 5.
PROMPT;

    public function __construct(
        private HttpClientInterface $httpClient,
        private string $openaiApiKey
    ) {}

    /**
     * Analyze an artwork image and return approval recommendation.
     *
     * @param string $imagePath Absolute filesystem path or URL to the image
     * @return array{approved: bool, reason: string, score: int}
     */
    public function analyze(string $imagePath): array
    {
        $default = ['approved' => false, 'reason' => 'Unable to analyze artwork.', 'score' => 0];

        if (empty($this->openaiApiKey) || $this->openaiApiKey === 'your-key-here') {
            return $default;
        }

        try {
            // Build the image content — either base64 or URL
            $imageContent = $this->buildImageContent($imagePath);
            if (!$imageContent) {
                return $default;
            }

            $response = $this->httpClient->request('POST', 'https://api.openai.com/v1/chat/completions', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->openaiApiKey,
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'model'       => 'gpt-4o-mini',
                    'messages'    => [
                        [
                            'role'    => 'system',
                            'content' => 'You are an art curator AI. Respond only with valid JSON.',
                        ],
                        [
                            'role'    => 'user',
                            'content' => [
                                ['type' => 'text', 'text' => self::ANALYSIS_PROMPT],
                                $imageContent,
                            ],
                        ],
                    ],
                    'max_tokens'  => 150,
                    'temperature' => 0.3,
                ],
            ]);

            $body  = $response->toArray();
            $reply = $body['choices'][0]['message']['content'] ?? '';

            // Parse JSON from AI response
            $result = json_decode(trim($reply), true);
            if (!is_array($result) || !isset($result['approved'])) {
                // Try to extract JSON from potential markdown fences
                if (preg_match('/\{[^}]+\}/', $reply, $matches)) {
                    $result = json_decode($matches[0], true);
                }
            }

            if (is_array($result) && isset($result['approved'])) {
                return [
                    'approved' => (bool) $result['approved'],
                    'reason'   => $result['reason'] ?? 'AI analysis complete.',
                    'score'    => (int) ($result['score'] ?? 5),
                ];
            }

            return $default;

        } catch (\Exception $e) {
            return ['approved' => false, 'reason' => 'AI analysis failed: ' . $e->getMessage(), 'score' => 0];
        }
    }

    /**
     * Build the image content payload for OpenAI Vision API.
     */
    private function buildImageContent(string $imagePath): ?array
    {
        // If it's already a URL
        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return [
                'type'      => 'image_url',
                'image_url' => ['url' => $imagePath],
            ];
        }

        // Try to read as local file and encode to base64
        if (file_exists($imagePath) && is_readable($imagePath)) {
            $data     = file_get_contents($imagePath);
            $mimeType = mime_content_type($imagePath) ?: 'image/png';
            $base64   = base64_encode($data);

            return [
                'type'      => 'image_url',
                'image_url' => ['url' => "data:{$mimeType};base64,{$base64}"],
            ];
        }

        return null;
    }
}
