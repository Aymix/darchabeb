<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Psr\Log\LoggerInterface;

/**
 * External API proxy controller — one endpoint per module.
 * Keeps all API keys server-side and provides a clean JSON interface.
 *
 * 1. Drawing     → Unsplash API (reference images)
 * 2. Pixel Art   → The Color API (color harmonies)
 * 3. Beat Maker  → Freesound API (sound samples)
 * 4. Acoustic    → Deezer API (music discovery)
 * 5. Storyteller → Datamuse API (synonyms, rhymes)
 * 6. 3D Builder  → Poly Haven API (HDRIs & textures)
 * 7. Museum      → Art Institute of Chicago API (artworks)
 * 8. Feed        → Giphy API (GIF search)
 */
#[Route('/api/external')]
#[IsGranted('ROLE_USER')]
class ExternalApiController extends AbstractController
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private LoggerInterface $logger,
    ) {}

    /* ═══════════════════════════════════════════════
       1. DRAWING → Unsplash API
       Search high-quality reference photos
    ═══════════════════════════════════════════════ */

    #[Route('/unsplash/search', name: 'api_unsplash_search', methods: ['GET'])]
    public function unsplashSearch(Request $request): JsonResponse
    {
        $query = trim($request->query->get('q', ''));
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(20, max(1, (int) $request->query->get('per_page', 9)));

        if ($query === '') {
            return new JsonResponse(['error' => 'Query is required.'], 400);
        }

        $apiKey = $this->getParameter('app.unsplash_access_key');
        if (!$apiKey || $apiKey === 'change_me_in_env_local') {
            return new JsonResponse(['error' => 'Unsplash API key not configured.'], 503);
        }

        try {
            $response = $this->httpClient->request('GET', 'https://api.unsplash.com/search/photos', [
                'headers' => ['Authorization' => 'Client-ID ' . $apiKey],
                'query' => [
                    'query' => $query,
                    'page' => $page,
                    'per_page' => $perPage,
                    'orientation' => 'landscape',
                ],
            ]);

            $data = $response->toArray();
            $results = array_map(fn($img) => [
                'id' => $img['id'],
                'thumb' => $img['urls']['thumb'] ?? '',
                'small' => $img['urls']['small'] ?? '',
                'regular' => $img['urls']['regular'] ?? '',
                'alt' => $img['alt_description'] ?? '',
                'author' => $img['user']['name'] ?? 'Unknown',
                'author_url' => $img['user']['links']['html'] ?? '',
            ], $data['results'] ?? []);

            return new JsonResponse([
                'total' => $data['total'] ?? 0,
                'pages' => $data['total_pages'] ?? 0,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Unsplash API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       2. PIXEL ART → The Color API
       Generate color harmonies from a base color
    ═══════════════════════════════════════════════ */

    #[Route('/colorapi/scheme', name: 'api_colorapi_scheme', methods: ['GET'])]
    public function colorScheme(Request $request): JsonResponse
    {
        $hex = ltrim($request->query->get('hex', 'f97316'), '#');
        $mode = $request->query->get('mode', 'analogic');
        $count = min(10, max(2, (int) $request->query->get('count', 6)));

        $validModes = ['monochrome', 'monochrome-dark', 'monochrome-light', 'analogic', 'complement', 'analogic-complement', 'triad', 'quad'];
        if (!in_array($mode, $validModes)) {
            $mode = 'analogic';
        }

        try {
            $response = $this->httpClient->request('GET', 'https://www.thecolorapi.com/scheme', [
                'query' => [
                    'hex' => $hex,
                    'mode' => $mode,
                    'count' => $count,
                    'format' => 'json',
                ],
            ]);

            $data = $response->toArray();
            $colors = array_map(fn($c) => [
                'hex' => $c['hex']['value'] ?? '',
                'name' => $c['name']['value'] ?? '',
                'rgb' => $c['rgb']['value'] ?? '',
                'hsl' => $c['hsl']['value'] ?? '',
            ], $data['colors'] ?? []);

            return new JsonResponse([
                'mode' => $data['mode'] ?? $mode,
                'seed' => [
                    'hex' => $data['seed']['hex']['value'] ?? '#' . $hex,
                    'name' => $data['seed']['name']['value'] ?? '',
                ],
                'colors' => $colors,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Color API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       3. BEAT MAKER → Freesound API
       Search free sound samples
    ═══════════════════════════════════════════════ */

    #[Route('/freesound/search', name: 'api_freesound_search', methods: ['GET'])]
    public function freesoundSearch(Request $request): JsonResponse
    {
        $query = trim($request->query->get('q', ''));
        $page = max(1, (int) $request->query->get('page', 1));
        $pageSize = min(15, max(1, (int) $request->query->get('page_size', 8)));

        if ($query === '') {
            return new JsonResponse(['error' => 'Query is required.'], 400);
        }

        $apiKey = $this->getParameter('app.freesound_api_key');
        if (!$apiKey || $apiKey === 'change_me_in_env_local') {
            return new JsonResponse(['error' => 'Freesound API key not configured.'], 503);
        }

        try {
            $response = $this->httpClient->request('GET', 'https://freesound.org/apiv2/search/text/', [
                'query' => [
                    'query' => $query,
                    'page' => $page,
                    'page_size' => $pageSize,
                    'fields' => 'id,name,duration,previews,tags,username',
                    'token' => $apiKey,
                ],
            ]);

            $data = $response->toArray();
            $results = array_map(fn($s) => [
                'id' => $s['id'],
                'name' => $s['name'] ?? 'Untitled',
                'duration' => round($s['duration'] ?? 0, 1),
                'preview_url' => $s['previews']['preview-lq-mp3'] ?? $s['previews']['preview-hq-mp3'] ?? '',
                'tags' => array_slice($s['tags'] ?? [], 0, 5),
                'author' => $s['username'] ?? 'Unknown',
            ], $data['results'] ?? []);

            return new JsonResponse([
                'count' => $data['count'] ?? 0,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Freesound API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       4. ACOUSTIC MUSIC → Deezer API
       Search tracks/artists for musical inspiration
    ═══════════════════════════════════════════════ */

    #[Route('/deezer/search', name: 'api_deezer_search', methods: ['GET'])]
    public function deezerSearch(Request $request): JsonResponse
    {
        $query = trim($request->query->get('q', ''));
        $limit = min(25, max(1, (int) $request->query->get('limit', 10)));

        if ($query === '') {
            return new JsonResponse(['error' => 'Query is required.'], 400);
        }

        try {
            $response = $this->httpClient->request('GET', 'https://api.deezer.com/search', [
                'query' => [
                    'q' => $query,
                    'limit' => $limit,
                ],
            ]);

            $data = $response->toArray();
            $results = array_map(fn($t) => [
                'id' => $t['id'],
                'title' => $t['title'] ?? '',
                'artist' => $t['artist']['name'] ?? '',
                'album' => $t['album']['title'] ?? '',
                'cover' => $t['album']['cover_medium'] ?? $t['album']['cover_small'] ?? '',
                'duration' => $t['duration'] ?? 0,
                'preview' => $t['preview'] ?? '',
            ], $data['data'] ?? []);

            return new JsonResponse([
                'total' => $data['total'] ?? 0,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Deezer API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       5. STORYTELLER → Datamuse API
       Synonyms, rhymes, related words for writers
    ═══════════════════════════════════════════════ */

    #[Route('/datamuse/words', name: 'api_datamuse_words', methods: ['GET'])]
    public function datamuseWords(Request $request): JsonResponse
    {
        $word = trim($request->query->get('word', ''));
        $type = $request->query->get('type', 'syn');
        $max = min(20, max(1, (int) $request->query->get('max', 10)));

        if ($word === '') {
            return new JsonResponse(['error' => 'Word is required.'], 400);
        }

        // Map type to Datamuse query parameter
        $paramMap = [
            'syn' => 'rel_syn',   // Synonyms
            'ant' => 'rel_ant',   // Antonyms
            'rhy' => 'rel_rhy',   // Rhymes
            'adj' => 'rel_jjb',   // Adjectives used to describe word
            'noun' => 'rel_jja',  // Nouns described by the word
            'similar' => 'ml',    // Meaning-like (semantic similarity)
            'sounds' => 'sl',     // Sounds-like
            'starts' => 'sp',     // Starts with (prefix)
        ];

        $param = $paramMap[$type] ?? 'rel_syn';

        try {
            $response = $this->httpClient->request('GET', 'https://api.datamuse.com/words', [
                'query' => [
                    $param => $word,
                    'max' => $max,
                    'md' => 'd,p',  // Include definitions and parts of speech
                ],
            ]);

            $data = $response->toArray();
            $results = array_map(fn($w) => [
                'word' => $w['word'] ?? '',
                'score' => $w['score'] ?? 0,
                'tags' => $w['tags'] ?? [],
                'defs' => $w['defs'] ?? [],
            ], $data);

            return new JsonResponse([
                'query' => $word,
                'type' => $type,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Datamuse API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       6. 3D BUILDER → Poly Haven API
       Browse free HDRIs and textures
    ═══════════════════════════════════════════════ */

    #[Route('/polyhaven/assets', name: 'api_polyhaven_assets', methods: ['GET'])]
    public function polyHavenAssets(Request $request): JsonResponse
    {
        $type = $request->query->get('type', 'hdris'); // hdris or textures

        if (!in_array($type, ['hdris', 'textures'])) {
            $type = 'hdris';
        }

        try {
            $response = $this->httpClient->request('GET', 'https://api.polyhaven.com/assets', [
                'query' => ['t' => $type],
            ]);

            $data = $response->toArray();

            // Poly Haven returns {asset_id: {name, ...}}  — transform to array
            $results = [];
            $count = 0;
            foreach ($data as $id => $asset) {
                if ($count >= 24) break; // Limit results
                $results[] = [
                    'id' => $id,
                    'name' => $asset['name'] ?? $id,
                    'categories' => array_keys($asset['categories'] ?? []),
                    'tags' => $asset['tags'] ?? [],
                    'thumbnail' => "https://cdn.polyhaven.com/asset_img/thumbs/{$id}.png?width=256",
                    'download_url' => "https://dl.polyhaven.org/file/ph-assets/{$type}/{$id}",
                ];
                $count++;
            }

            return new JsonResponse([
                'type' => $type,
                'count' => count($results),
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Poly Haven API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       7. MUSEUM → Art Institute of Chicago API
       Browse real artworks from the Art Institute
    ═══════════════════════════════════════════════ */

    #[Route('/artic/artworks', name: 'api_artic_artworks', methods: ['GET'])]
    public function articArtworks(Request $request): JsonResponse
    {
        $query = trim($request->query->get('q', ''));
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(20, max(1, (int) $request->query->get('limit', 12)));

        try {
            $params = [
                'page' => $page,
                'limit' => $limit,
                'fields' => 'id,title,artist_display,date_display,medium_display,image_id,thumbnail,dimensions,department_title',
            ];

            $url = $query !== ''
                ? 'https://api.artic.edu/api/v1/artworks/search'
                : 'https://api.artic.edu/api/v1/artworks';

            if ($query !== '') {
                $params['q'] = $query;
            }

            $response = $this->httpClient->request('GET', $url, [
                'query' => $params,
            ]);

            $data = $response->toArray();
            $iiifBase = $data['config']['iiif_url'] ?? 'https://www.artic.edu/iiif/2';

            $results = array_map(function ($artwork) use ($iiifBase) {
                $imageId = $artwork['image_id'] ?? null;
                return [
                    'id' => $artwork['id'],
                    'title' => $artwork['title'] ?? 'Untitled',
                    'artist' => $artwork['artist_display'] ?? 'Unknown Artist',
                    'date' => $artwork['date_display'] ?? '',
                    'medium' => $artwork['medium_display'] ?? '',
                    'department' => $artwork['department_title'] ?? '',
                    'image_url' => $imageId ? "{$iiifBase}/{$imageId}/full/600,/0/default.jpg" : null,
                    'thumb_url' => $imageId ? "{$iiifBase}/{$imageId}/full/200,/0/default.jpg" : null,
                ];
            }, $data['data'] ?? []);

            return new JsonResponse([
                'total' => $data['pagination']['total'] ?? 0,
                'page' => $page,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Art Institute API error: ' . $e->getMessage()], 500);
        }
    }

    /* ═══════════════════════════════════════════════
       8. FEED → Giphy API
       Search GIFs to embed in posts
    ═══════════════════════════════════════════════ */

    #[Route('/giphy/search', name: 'api_giphy_search', methods: ['GET'])]
    public function giphySearch(Request $request): JsonResponse
    {
        $query = trim($request->query->get('q', ''));
        $limit = min(20, max(1, (int) $request->query->get('limit', 12)));
        $offset = max(0, (int) $request->query->get('offset', 0));

        if ($query === '') {
            return new JsonResponse(['error' => 'Query is required.'], 400);
        }

        $apiKey = $this->getParameter('app.giphy_api_key');
        if (!$apiKey || $apiKey === 'change_me_in_env_local') {
            return new JsonResponse(['error' => 'Giphy API key not configured.'], 503);
        }

        try {
            $response = $this->httpClient->request('GET', 'https://api.giphy.com/v1/gifs/search', [
                'query' => [
                    'api_key' => $apiKey,
                    'q' => $query,
                    'limit' => $limit,
                    'offset' => $offset,
                    'rating' => 'g',
                    'lang' => 'en',
                ],
            ]);

            $data = $response->toArray();
            $results = array_map(fn($gif) => [
                'id' => $gif['id'],
                'title' => $gif['title'] ?? '',
                'url' => $gif['images']['fixed_height']['url'] ?? '',
                'thumb' => $gif['images']['fixed_height_small']['url'] ?? $gif['images']['preview_gif']['url'] ?? '',
                'width' => (int) ($gif['images']['fixed_height']['width'] ?? 200),
                'height' => (int) ($gif['images']['fixed_height']['height'] ?? 200),
                'embed_url' => $gif['embed_url'] ?? '',
            ], $data['data'] ?? []);

            return new JsonResponse([
                'total' => $data['pagination']['total_count'] ?? 0,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Giphy API error: ' . $e->getMessage()], 500);
        }
    }
}
