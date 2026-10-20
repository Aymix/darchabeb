<?php
/**
 * Generate demo artwork images and audio for museum submissions.
 * Run: php generate_demo_assets.php
 */

$pdo = new PDO('mysql:host=127.0.0.1;dbname=virtuartdb', 'root', '');

// Create directories
$imgDir = __DIR__ . '/public/uploads/museum';
$audioDir = __DIR__ . '/public/uploads/audio';
if (!is_dir($imgDir)) mkdir($imgDir, 0755, true);
if (!is_dir($audioDir)) mkdir($audioDir, 0755, true);

// ═══════════════════════════════════════════
// Color palettes per artwork type
// ═══════════════════════════════════════════
$palettes = [
    'drawing' => [
        [[255,100,50],[255,180,20],[255,220,100]], // warm sunset
        [[100,50,200],[180,80,255],[220,150,255]], // purple dreamy
        [[20,150,200],[80,200,230],[200,240,255]], // ocean blue
        [[200,50,80],[255,100,120],[255,180,200]], // rose garden
        [[50,180,100],[100,220,80],[200,255,150]], // nature green
    ],
    'pixel_art' => [
        [[255,0,100],[0,255,200],[255,255,0]],
        [[0,150,255],[255,100,0],[0,255,100]],
        [[200,0,255],[255,200,0],[0,200,200]],
        [[255,50,50],[50,255,50],[50,50,255]],
        [[255,150,0],[0,200,150],[200,0,200]],
    ],
    '3d_shape' => [
        [[60,20,120],[120,50,200],[180,100,255]],
        [[20,80,120],[50,150,200],[100,200,255]],
        [[120,20,60],[200,50,100],[255,100,150]],
        [[20,100,80],[50,180,120],[100,230,180]],
        [[80,80,20],[160,160,50],[220,220,100]],
    ],
    'story' => [
        [[40,30,60],[80,60,120],[140,100,180]],
        [[60,40,30],[120,80,50],[180,130,80]],
        [[30,50,60],[60,100,120],[100,160,190]],
        [[50,30,40],[110,60,80],[170,100,130]],
        [[40,50,30],[80,110,60],[130,170,100]],
    ],
    'music' => [
        [[255,50,100],[255,150,50],[255,220,0]],
        [[50,100,255],[100,200,255],[200,230,255]],
        [[180,50,255],[255,50,180],[255,150,200]],
        [[50,200,100],[100,255,150],[200,255,200]],
        [[255,100,0],[255,180,50],[255,230,100]],
    ],
];

// ═══════════════════════════════════════════
// Generate artwork images
// ═══════════════════════════════════════════
function generateArtwork($type, $palette, $title, $filename) {
    global $imgDir;
    $w = 800; $h = 600;
    $img = imagecreatetruecolor($w, $h);
    imagealphablending($img, true);

    // Background gradient
    $c1 = $palette[0]; $c2 = $palette[1];
    for ($y = 0; $y < $h; $y++) {
        $r = (int)($c1[0] + ($c2[0]-$c1[0]) * $y/$h);
        $g = (int)($c1[1] + ($c2[1]-$c1[1]) * $y/$h);
        $b = (int)($c1[2] + ($c2[2]-$c1[2]) * $y/$h);
        $col = imagecolorallocate($img, $r, $g, $b);
        imageline($img, 0, $y, $w, $y, $col);
    }

    switch ($type) {
        case 'drawing':
            // Flowing curves and shapes
            for ($i = 0; $i < 8; $i++) {
                $cx = rand(100, $w-100); $cy = rand(100, $h-100);
                $rr = rand(40, 150);
                $c = $palette[rand(0,2)];
                $col = imagecolorallocatealpha($img, $c[0], $c[1], $c[2], rand(20,60));
                imagefilledellipse($img, $cx, $cy, $rr*2, $rr*2, $col);
            }
            // Abstract brush strokes
            imagesetthickness($img, 3);
            for ($i = 0; $i < 5; $i++) {
                $c = $palette[rand(0,2)];
                $col = imagecolorallocatealpha($img, min(255,$c[0]+50), min(255,$c[1]+50), min(255,$c[2]+50), 30);
                $pts = [];
                $sx = rand(0, $w); $sy = rand(0, $h);
                for ($j = 0; $j < 6; $j++) {
                    $sx += rand(-100,100); $sy += rand(-80,80);
                    imageline($img, $sx-rand(5,15), $sy-rand(5,15), $sx+rand(5,15), $sy+rand(5,15), $col);
                }
            }
            break;

        case 'pixel_art':
            // Pixelated grid pattern
            $ps = 20;
            for ($x = 0; $x < $w; $x += $ps) {
                for ($y = 0; $y < $h; $y += $ps) {
                    if (rand(0,3) > 0) continue;
                    $c = $palette[rand(0,2)];
                    $col = imagecolorallocate($img, $c[0], $c[1], $c[2]);
                    imagefilledrectangle($img, $x, $y, $x+$ps-2, $y+$ps-2, $col);
                }
            }
            // Central pixel character
            $cx = $w/2 - 60; $cy = $h/2 - 80;
            $c = $palette[2];
            $col = imagecolorallocate($img, $c[0], $c[1], $c[2]);
            for ($i = 0; $i < 6; $i++) {
                for ($j = 0; $j < 8; $j++) {
                    if (rand(0,2) > 0)
                        imagefilledrectangle($img, (int)($cx+$i*$ps), (int)($cy+$j*$ps), (int)($cx+$i*$ps+$ps-2), (int)($cy+$j*$ps+$ps-2), $col);
                }
            }
            break;

        case '3d_shape':
            // Geometric 3D-like shapes
            for ($i = 0; $i < 5; $i++) {
                $cx = rand(150, $w-150); $cy = rand(150, $h-150);
                $size = rand(60, 140);
                $c = $palette[rand(0,2)];
                // Draw a "3D" cube
                $dark = imagecolorallocatealpha($img, (int)($c[0]*0.6), (int)($c[1]*0.6), (int)($c[2]*0.6), 20);
                $mid = imagecolorallocatealpha($img, $c[0], $c[1], $c[2], 15);
                $light = imagecolorallocatealpha($img, min(255,(int)($c[0]*1.3)), min(255,(int)($c[1]*1.3)), min(255,(int)($c[2]*1.3)), 25);
                // Front face
                imagefilledrectangle($img, $cx, $cy, $cx+$size, $cy+$size, $mid);
                // Top face
                $pts = [$cx, $cy, $cx+$size, $cy, $cx+$size+30, $cy-25, $cx+30, $cy-25];
                imagefilledpolygon($img, $pts, $light);
                // Right face
                $pts = [$cx+$size, $cy, $cx+$size+30, $cy-25, $cx+$size+30, $cy+$size-25, $cx+$size, $cy+$size];
                imagefilledpolygon($img, $pts, $dark);
            }
            break;

        case 'story':
            // Book/manuscript aesthetic
            // Parchment overlay
            $parchment = imagecolorallocatealpha($img, 240, 220, 180, 60);
            imagefilledrectangle($img, 100, 60, $w-100, $h-60, $parchment);
            // Text lines
            $lineCol = imagecolorallocatealpha($img, 60, 40, 30, 40);
            for ($y = 100; $y < $h-100; $y += 28) {
                $lineW = rand((int)($w*0.4), (int)($w*0.7));
                imagefilledrectangle($img, 140, $y, 140+$lineW, $y+4, $lineCol);
            }
            // Decorative initial letter
            $c = $palette[1];
            $accent = imagecolorallocatealpha($img, $c[0], $c[1], $c[2], 20);
            imagefilledrectangle($img, 130, 90, 200, 170, $accent);
            break;

        case 'music':
            // Sound wave / equalizer
            $barW = 12;
            $gap = 4;
            $startX = 50;
            for ($x = $startX; $x < $w - 50; $x += $barW + $gap) {
                $barH = rand(30, (int)($h * 0.7));
                $barY = ($h - $barH) / 2;
                $c = $palette[rand(0,2)];
                $col = imagecolorallocatealpha($img, $c[0], $c[1], $c[2], rand(10,40));
                imagefilledrectangle($img, $x, (int)$barY, $x+$barW, (int)($barY+$barH), $col);
                // Reflection
                $refCol = imagecolorallocatealpha($img, $c[0], $c[1], $c[2], 90);
                imagefilledrectangle($img, $x, (int)($barY+$barH), $x+$barW, (int)($barY+$barH+$barH*0.2), $refCol);
            }
            // Music note icon
            $noteCol = imagecolorallocatealpha($img, 255, 255, 255, 40);
            imagefilledellipse($img, $w/2, $h/2, 60, 50, $noteCol);
            break;
    }

    // Title overlay at bottom
    $overlay = imagecolorallocatealpha($img, 0, 0, 0, 60);
    imagefilledrectangle($img, 0, $h-60, $w, $h, $overlay);
    $white = imagecolorallocate($img, 255, 255, 255);
    $fontSize = 4; // GD built-in font
    imagestring($img, $fontSize, 20, $h-40, $title, $white);

    $path = $imgDir . '/' . $filename;
    imagepng($img, $path);
    imagedestroy($img);
    echo "  Created: $filename\n";
    return '/uploads/museum/' . $filename;
}

// ═══════════════════════════════════════════
// Generate WAV audio files for music
// ═══════════════════════════════════════════
function generateWav($filename, $durationSec = 5, $freq = 440) {
    global $audioDir;
    $sampleRate = 22050;
    $numSamples = $sampleRate * $durationSec;
    $dataSize = $numSamples * 2; // 16-bit

    // WAV header
    $header = pack('A4', 'RIFF');
    $header .= pack('V', 36 + $dataSize);
    $header .= pack('A4', 'WAVE');
    $header .= pack('A4', 'fmt ');
    $header .= pack('V', 16); // chunk size
    $header .= pack('v', 1);  // PCM
    $header .= pack('v', 1);  // mono
    $header .= pack('V', $sampleRate);
    $header .= pack('V', $sampleRate * 2);
    $header .= pack('v', 2);  // block align
    $header .= pack('v', 16); // bits/sample
    $header .= pack('A4', 'data');
    $header .= pack('V', $dataSize);

    $data = '';
    for ($i = 0; $i < $numSamples; $i++) {
        $t = $i / $sampleRate;
        // Create a pleasant chord with fade
        $envelope = min(1, $t * 4) * max(0, 1 - $t / $durationSec);
        $sample = sin(2 * M_PI * $freq * $t) * 0.4;
        $sample += sin(2 * M_PI * $freq * 1.25 * $t) * 0.2; // major third
        $sample += sin(2 * M_PI * $freq * 1.5 * $t) * 0.15;  // fifth
        $sample *= $envelope;
        $val = (int)($sample * 16000);
        $val = max(-32768, min(32767, $val));
        $data .= pack('v', $val & 0xFFFF);
    }

    $path = $audioDir . '/' . $filename;
    file_put_contents($path, $header . $data);
    echo "  Audio: $filename\n";
    return '/uploads/audio/' . $filename;
}

// ═══════════════════════════════════════════
// Process all museum submissions
// ═══════════════════════════════════════════
echo "=== Generating Demo Assets ===\n\n";

$stmt = $pdo->query("SELECT id, title, type FROM museum_submissions ORDER BY id");
$submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

$typeCounters = [];
$musicFreqs = [261, 329, 392, 440, 523]; // C4, E4, G4, A4, C5

foreach ($submissions as $sub) {
    $type = $sub['type'];
    $id = $sub['id'];
    $title = $sub['title'];

    if (!isset($typeCounters[$type])) $typeCounters[$type] = 0;
    $idx = $typeCounters[$type];

    $pal = $palettes[$type][$idx % 5] ?? $palettes['drawing'][$idx % 5];
    $filename = "demo_{$type}_{$id}.png";

    echo "[$type] $title\n";
    $imgPath = generateArtwork($type, $pal, $title, $filename);

    // Update DB
    $pdo->prepare("UPDATE museum_submissions SET image_path = ? WHERE id = ?")
        ->execute([$imgPath, $id]);

    // Also generate audio for music type
    if ($type === 'music') {
        $audioFile = "demo_music_{$id}.wav";
        $audioPath = generateWav($audioFile, rand(4, 8), $musicFreqs[$idx % 5]);
    }

    $typeCounters[$type]++;
}

echo "\n=== Done! Generated " . count($submissions) . " images ===\n";
