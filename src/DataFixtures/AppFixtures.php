<?php

namespace App\DataFixtures;

use App\Entity\AcousticRecording;
use App\Entity\ActivityModule;
use App\Entity\Chapter;
use App\Entity\MuseumSubmission;
use App\Entity\Scene;
use App\Entity\Story;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(
        private UserPasswordHasherInterface $passwordHasher,
    ) {}

    public function load(ObjectManager $manager): void
    {

        // ════════════════════════════════════════════════
        // 2. ACTIVITY MODULES (8 modules)
        // ════════════════════════════════════════════════
        $moduleDefs = [
            ['Drawing Studio',     '🎨'],
            ['Pixel Art',          '🕹️'],
            ['3D Shapes',          '🧊'],
            ['Story Workshop',     '📚'],
            ['Acoustic Music',     '🎸'],
            ['Music Production',   '🎹'],
            ['Virtual Museum',     '🏛️'],
            ['Artist Feed',        '📣'],
        ];
        $modules = [];
        foreach ($moduleDefs as $i => [$name, $emoji]) {
            $m = new ActivityModule();
            $m->setName($name);
            $m->setEmoji($emoji);
            $m->setStatus('ACTIVE');
            $manager->persist($m);
            $modules[$i] = $m;
        }

        // ════════════════════════════════════════════════
        // 3. ADMIN USER
        // ════════════════════════════════════════════════
        $admin = $this->makeUser($manager, 'Admin', 'System', 'admin@virtuarts.tn', 'admin123', 'ADMIN', 30);

        // ════════════════════════════════════════════════
        // 4. EIGHT SUPERVISORS (one per module)
        // ════════════════════════════════════════════════
        $supervisorData = [
            ['Sophie',  'Laurent',   'sophie.laurent@virtuarts.tn',   25],
            ['Marcus',  'Chen',      'marcus.chen@virtuarts.tn',      32],
            ['Elena',   'Vasquez',   'elena.vasquez@virtuarts.tn',    28],
            ['Omar',    'Benali',    'omar.benali@virtuarts.tn',      35],
            ['Yuki',    'Tanaka',    'yuki.tanaka@virtuarts.tn',      27],
            ['Dmitri',  'Volkov',    'dmitri.volkov@virtuarts.tn',    31],
            ['Amara',   'Diallo',    'amara.diallo@virtuarts.tn',     29],
            ['Lucas',   'Moretti',   'lucas.moretti@virtuarts.tn',    33],
        ];
        $supervisors = [];
        foreach ($supervisorData as $i => [$fn, $ln, $email, $age]) {
            $sup = $this->makeUser($manager, $fn, $ln, $email, 'super123', 'SUPERVISEUR', $age);
            $modules[$i]->setSupervisorName("$fn $ln");
            $supervisors[] = $sup;
        }

        // ════════════════════════════════════════════════
        // 5. FIVE ARTIST USERS
        // ════════════════════════════════════════════════
        $artistData = [
            ['Lina',   'Khouni',   'lina@virtuarts.tn',    22],
            ['Amine',  'Jaziri',   'amine@virtuarts.tn',   24],
            ['Sara',   'Hamdi',    'sara@virtuarts.tn',     21],
            ['Youssef','Trabelsi', 'youssef@virtuarts.tn',  23],
            ['Nour',   'Ayari',    'nour@virtuarts.tn',     20],
        ];
        $artists = [];
        foreach ($artistData as [$fn, $ln, $email, $age]) {
            $artists[] = $this->makeUser($manager, $fn, $ln, $email, 'artist123', 'USER', $age, rand(100, 500), rand(2, 8));
        }

        $manager->flush(); // flush users + modules so they have IDs

        // ════════════════════════════════════════════════
        // 6. DEMO STORIES (5 stories with chapters & scenes)
        // ════════════════════════════════════════════════
        $storyData = [
            [
                'title' => 'The Clockwork Garden',
                'genre' => 'Fantasy',
                'content' => 'In a world where flowers are made of gears and stems of copper wire, a young botanist discovers that her garden holds the key to an ancient machine that controls the seasons.',
                'chapters' => [
                    ['The Seed of Iron', [
                        ['Discovery', 'Elara knelt beside the rusted plot where nothing should grow. Yet there it was — a sprout of burnished copper, its tiny leaves unfurling like clockwork wings. She touched it, and felt a pulse beneath the soil, rhythmic as a heartbeat.'],
                        ['The First Bloom', 'By morning the sprout had become a full stem, its petals clicking open at dawn with a sound like a music box. Neighbors gathered, whispering about the old prophecy of the Gear Gardener.'],
                    ]],
                    ['Gears Beneath', [
                        ['Underground', 'Beneath the garden, Elara found corridors of interlocking gears, each one the size of a carriage wheel. They turned slowly, grinding time itself into seasons.'],
                        ['The Keeper', 'An ancient automaton stood guard. Its voice was the sound of wind chimes. "You have been chosen," it said, "to wind the world."'],
                    ]],
                ],
            ],
            [
                'title' => 'Echoes of the Medina',
                'genre' => 'Drama',
                'content' => 'A calligrapher in the old Tunis medina finds letters hidden in the walls of his workshop — love letters from a century ago that mirror his own unspoken feelings.',
                'chapters' => [
                    ['The Hidden Wall', [
                        ['Plaster and Ink', 'When Karim chipped away the crumbling plaster to repair his workshop wall, he found paper — yellowed, fragile, covered in the most beautiful Arabic script he had ever seen.'],
                        ['Words of Fire', 'The letters spoke of a love so fierce it burned through the centuries. "I write to you from a cage of stone," one began, "but my heart flies to you on every wind."'],
                    ]],
                    ['Mirror Lives', [
                        ['Her Name', 'The letters were signed "Yasmine." Karim felt a chill — the woman who sold jasmine flowers at the corner of his street shared the same name.'],
                        ['Confession', 'He copied the most beautiful passage onto fresh paper and left it where she would find it. The next morning, she stood at his door, eyes shining.'],
                    ]],
                ],
            ],
            [
                'title' => 'Neon Frequencies',
                'genre' => 'Sci-Fi',
                'content' => 'In a cyberpunk Tunis of 2087, a deaf street artist discovers she can see sound frequencies as colors — and that certain frequencies can hack into the city\'s neural network.',
                'chapters' => [
                    ['Static Vision', [
                        ['The Gift', 'Rania was born deaf, but she saw the world in colors no one else could — every vibration, every footstep, every heartbeat painted the air in shifting hues of violet and gold.'],
                        ['The Frequency', 'When she stumbled upon 432 Hz rendered in deep indigo, she watched it ripple through a smart-wall and change its display. She had discovered the city\'s backdoor.'],
                    ]],
                    ['Chromatic Rebellion', [
                        ['The Collective', 'Other sensitives found her. They called themselves Les Fréquences. Together, they could paint revolutions on the city\'s digital canvas.'],
                        ['Broadcast', 'Their first act: turning every billboard in the medina into a cascade of Tunisian folk art, visible for twelve glorious minutes before the authorities pulled the plug.'],
                    ]],
                ],
            ],
            [
                'title' => 'The Last Olive Tree',
                'genre' => 'Drama',
                'content' => 'An elderly farmer fights to save the last ancient olive tree in his village — a tree that has witnessed 2,000 years of Tunisian history.',
                'chapters' => [
                    ['Roots', [
                        ['Si Mahmoud', 'The tree was older than memory. Si Mahmoud\'s grandfather had told him it was planted by Carthaginians, and his grandfather\'s grandfather had said the same.'],
                        ['The Threat', 'The developers came with papers and promises. A shopping center, they said. Progress. Si Mahmoud looked at the tree and saw centuries of harvests, of children climbing, of lovers carving initials.'],
                    ]],
                    ['Standing Ground', [
                        ['The Chain', 'He chained himself to the trunk on a Tuesday morning. By Wednesday, the whole village had joined him.'],
                        ['Victory', 'The photograph of Si Mahmoud embracing his tree went viral. The developers withdrew. The tree still stands, bearing fruit every autumn.'],
                    ]],
                ],
            ],
            [
                'title' => 'Quantum Brushstrokes',
                'genre' => 'Sci-Fi',
                'content' => 'An AI-powered paintbrush begins creating art on its own, and the paintings it produces reveal scenes from parallel universes.',
                'chapters' => [
                    ['The First Stroke', [
                        ['Initialization', 'Dr. Fatma loaded the neural weights at 3 AM. The robotic arm twitched, dipped into cerulean blue, and began to paint — a landscape she had never programmed.'],
                        ['Another World', 'The painting showed Tunis, but different. The buildings were crystalline. Two moons hung in a lavender sky. A figure stood on a balcony, waving — and it looked exactly like Fatma.'],
                    ]],
                    ['Convergence', [
                        ['The Message', 'Each new painting was a letter from the other side. The other Fatma was trying to communicate something urgent.'],
                        ['Bridge', 'When both Fatmas painted the same image simultaneously, the canvas shimmered. For one heartbeat, they could see each other through the paint.'],
                    ]],
                ],
            ],
        ];

        foreach ($storyData as $i => $sd) {
            $story = new Story();
            $story->setTitle($sd['title']);
            $story->setGenre($sd['genre']);
            $story->setContent($sd['content']);
            $story->setStatus('published');
            $manager->persist($story);

            foreach ($sd['chapters'] as $ci => [$chTitle, $scenes]) {
                $ch = new Chapter();
                $ch->setTitle($chTitle);
                $ch->setStory($story);
                $ch->setOrderIndex($ci + 1);
                $manager->persist($ch);

                foreach ($scenes as $si => [$scTitle, $scContent]) {
                    $sc = new Scene();
                    $sc->setTitle($scTitle);
                    $sc->setContent($scContent);
                    $sc->setChapter($ch);
                    $sc->setOrderIndex($si + 1);
                    $sc->setStatus('final');
                    $manager->persist($sc);
                }
            }
        }

        // ════════════════════════════════════════════════
        // 7. DEMO ACOUSTIC RECORDINGS (5)
        // ════════════════════════════════════════════════
        $acousticData = [
            ['Moonlight Sonata — Reimagined', 'piano', 180, $artists[0]],
            ['Mediterranean Guitar Sunset',   'guitar', 240, $artists[1]],
            ['Drums of the Sahara',            'drums',  150, $artists[2]],
            ['Andalusian Memories',             'guitar', 200, $artists[3]],
            ['Jazz in the Medina',              'piano', 210, $artists[4]],
        ];
        foreach ($acousticData as [$title, $instrument, $duration, $artist]) {
            $rec = new AcousticRecording();
            $rec->setTitle($title);
            $rec->setInstrument($instrument);
            $rec->setDurationSeconds($duration);
            $rec->setUser($artist);
            $rec->setData('[]'); // empty note data placeholder
            $manager->persist($rec);
        }

        // ════════════════════════════════════════════════
        // 8. MUSEUM SUBMISSIONS (5 per category = 25 total)
        //    All auto-approved with prices and varied types
        // ════════════════════════════════════════════════
        $museumData = [
            // Drawings
            ['Sunset Over Sidi Bou Said',    'drawing',   $artists[0], $modules[0], '29.90'],
            ['Abstract Harmony',             'drawing',   $artists[1], $modules[0], '45.00'],
            ['Portrait of Light',            'drawing',   $artists[2], $modules[0], '55.00'],
            ['Underwater Dreams',            'drawing',   $artists[3], $modules[0], '35.50'],
            ['City in the Clouds',           'drawing',   $artists[4], $modules[0], '60.00'],
            // Stories
            ['The Clockwork Garden',         'story',     $artists[0], $modules[3], '15.00'],
            ['Echoes of the Medina',         'story',     $artists[1], $modules[3], '12.50'],
            ['Neon Frequencies',             'story',     $artists[2], $modules[3], '18.00'],
            ['The Last Olive Tree',          'story',     $artists[3], $modules[3], '10.00'],
            ['Quantum Brushstrokes',         'story',     $artists[4], $modules[3], '20.00'],
            // Music
            ['Moonlight Sonata — Reimagined','music',     $artists[0], $modules[4], '8.90'],
            ['Mediterranean Guitar Sunset',  'music',     $artists[1], $modules[4], '9.50'],
            ['Drums of the Sahara',          'music',     $artists[2], $modules[5], '7.00'],
            ['Andalusian Memories',           'music',     $artists[3], $modules[4], '11.00'],
            ['Jazz in the Medina',           'music',     $artists[4], $modules[5], '6.50'],
            // Pixel Art
            ['Pixel Warrior',                'pixel_art', $artists[0], $modules[1], '25.00'],
            ['Retro Cityscape',              'pixel_art', $artists[1], $modules[1], '30.00'],
            ['8-Bit Forest',                 'pixel_art', $artists[2], $modules[1], '22.00'],
            ['Space Invader Garden',         'pixel_art', $artists[3], $modules[1], '28.00'],
            ['Pixel Sunset',                 'pixel_art', $artists[4], $modules[1], '19.90'],
            // 3D Shapes
            ['Crystal Formation',            '3d_shape',  $artists[0], $modules[2], '40.00'],
            ['Geometric Dreamscape',         '3d_shape',  $artists[1], $modules[2], '55.00'],
            ['Abstract Sculpture #7',        '3d_shape',  $artists[2], $modules[2], '48.00'],
            ['Neon Toroid',                  '3d_shape',  $artists[3], $modules[2], '35.00'],
            ['Floating Islands',             '3d_shape',  $artists[4], $modules[2], '65.00'],
        ];

        foreach ($museumData as [$title, $type, $artist, $module, $price]) {
            $sub = new MuseumSubmission();
            $sub->setTitle($title);
            $sub->setType($type);
            $sub->setUser($artist);
            $sub->setModule($module);
            $sub->setPrice($price);
            $sub->setStatus(MuseumSubmission::STATUS_ACCEPTED);
            $sub->setAiAutoApproved(true);
            $sub->setSupervisorNote('🤖 Auto-approved — demo artwork.');
            $sub->setSubmittedAt(new \DateTime('-' . rand(1, 30) . ' days'));
            $manager->persist($sub);
        }

        // ════════════════════════════════════════════════
        // FLUSH ALL
        // ════════════════════════════════════════════════
        $manager->flush();
    }

    private function makeUser(
        ObjectManager $manager,
        string $firstName,
        string $lastName,
        string $email,
        string $password,
        string $role,
        int $age,
        int $points = 0,
        int $level = 1
    ): User {
        $user = new User();
        $user->setFirstName($firstName);
        $user->setLastName($lastName);
        $user->setEmail($email);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));
        $user->setRole($role);
        $user->setAge($age);
        $user->setPoints($points);
        $user->setLevel($level);
        $user->setXp($points);
        $manager->persist($user);
        return $user;
    }
}
