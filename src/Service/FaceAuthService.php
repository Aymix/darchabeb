<?php

namespace App\Service;

use Psr\Cache\CacheItemPoolInterface;

/**
 * Face ID (webcam face match) — server-side checks.
 *
 * The browser turns a camera frame into a 128-number face template ("descriptor",
 * face-api.js FaceRecognitionNet). The decision is always made here, never in the browser:
 * the submitted template is compared with the enrolled one by Euclidean distance.
 *
 * Failed attempts are throttled per account and per IP.
 */
class FaceAuthService
{
    public const DESCRIPTOR_LENGTH = 128;
    /** Max distance for a match. face-api's usual 0.6 is too lenient for login; 0.45 trades a few retries for fewer false accepts. */
    public const MATCH_THRESHOLD = 0.45;
    /** Enrolment samples must agree with each other at least this well (same person, decent capture). */
    public const ENROL_CONSISTENCY = 0.40;
    public const MIN_ENROL_SAMPLES = 3;
    public const MAX_FAILURES = 5;
    public const LOCK_SECONDS = 900;

    public function __construct(private CacheItemPoolInterface $cache)
    {
    }

    /** @return float[]|null normalized descriptor, or null if the input is not a valid descriptor */
    public function sanitize(mixed $descriptor): ?array
    {
        if (!is_array($descriptor) || count($descriptor) !== self::DESCRIPTOR_LENGTH || !array_is_list($descriptor)) {
            return null;
        }
        $out = [];
        foreach ($descriptor as $v) {
            if (!is_int($v) && !is_float($v)) {
                return null;
            }
            $v = (float) $v;
            if (!is_finite($v) || abs($v) > 1.0) {
                return null;
            }
            $out[] = round($v, 6);
        }
        // an all-zero / flat vector is not a face
        if ($this->norm($out) < 0.1) {
            return null;
        }
        return $out;
    }

    public function distance(array $a, array $b): float
    {
        $sum = 0.0;
        foreach ($a as $i => $v) {
            $d = $v - ($b[$i] ?? 0.0);
            $sum += $d * $d;
        }
        return sqrt($sum);
    }

    public function matches(array $enrolled, array $candidate): bool
    {
        return $this->distance($enrolled, $candidate) <= self::MATCH_THRESHOLD;
    }

    /**
     * Combine enrolment samples into one template.
     *
     * @param array<mixed> $samples
     * @return array{descriptor: ?array, error: ?string}
     */
    public function buildTemplate(array $samples): array
    {
        $clean = [];
        foreach ($samples as $s) {
            $d = $this->sanitize($s);
            if ($d === null) {
                return ['descriptor' => null, 'error' => 'Invalid face data received.'];
            }
            $clean[] = $d;
        }
        if (count($clean) < self::MIN_ENROL_SAMPLES || count($clean) > 10) {
            return ['descriptor' => null, 'error' => 'Please capture your face again.'];
        }
        for ($i = 0; $i < count($clean); $i++) {
            for ($j = $i + 1; $j < count($clean); $j++) {
                if ($this->distance($clean[$i], $clean[$j]) > self::ENROL_CONSISTENCY) {
                    return ['descriptor' => null, 'error' => 'The captures did not match each other. Make sure only you are in front of the camera, in good light, and try again.'];
                }
            }
        }
        $mean = array_fill(0, self::DESCRIPTOR_LENGTH, 0.0);
        foreach ($clean as $d) {
            foreach ($d as $k => $v) {
                $mean[$k] += $v / count($clean);
            }
        }
        return ['descriptor' => array_map(fn ($v) => round($v, 6), $mean), 'error' => null];
    }

    /* ── throttling ─────────────────────────────── */

    public function isLocked(string $email, string $ip): bool
    {
        foreach ($this->buckets($email, $ip) as [$key, $limit]) {
            $item = $this->cache->getItem($key);
            if ($item->isHit() && (int) $item->get() >= $limit) {
                return true;
            }
        }
        return false;
    }

    public function recordFailure(string $email, string $ip): void
    {
        foreach ($this->buckets($email, $ip) as [$key]) {
            $item = $this->cache->getItem($key);
            $item->set(($item->isHit() ? (int) $item->get() : 0) + 1)->expiresAfter(self::LOCK_SECONDS);
            $this->cache->save($item);
        }
    }

    public function clearFailures(string $email, string $ip): void
    {
        $this->cache->deleteItem($this->buckets($email, $ip)[0][0]);
    }

    /**
     * Per-account bucket (strict) and per-IP bucket (looser, so a shared network
     * isn't locked out by one person, but one client can't sweep many accounts).
     *
     * @return array<array{0: string, 1: int}>
     */
    private function buckets(string $email, string $ip): array
    {
        return [
            ['face_login_fail_' . hash('sha256', strtolower(trim($email))), self::MAX_FAILURES],
            ['face_login_fail_ip_' . hash('sha256', $ip), self::MAX_FAILURES * 4],
        ];
    }

    private function norm(array $v): float
    {
        return sqrt(array_sum(array_map(fn ($x) => $x * $x, $v)));
    }
}
