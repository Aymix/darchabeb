<?php

namespace App\Controller\User;

use App\Entity\AcousticRecording;
use App\Entity\AcousticTrack;
use App\Repository\AcousticRecordingRepository;
use App\Repository\AcousticTrackRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/music')]
#[IsGranted('ROLE_USER')]
class MusicController extends AbstractController
{
    // ─────────────────────────────────────────────
    //  HUB — Acoustic Music World
    // ─────────────────────────────────────────────

    #[Route('', name: 'app_music_studio')]
    public function hub(AcousticRecordingRepository $recRepo): Response
    {
        return $this->render('music/studio.html.twig', [
            'recordingCount' => $recRepo->countByUser($this->getUser()),
        ]);
    }

    // ─────────────────────────────────────────────
    //  Music Production (Beat Maker)
    // ─────────────────────────────────────────────

    #[Route('/beat-maker', name: 'app_music_beat')]
    public function beatMaker(): Response
    {
        return $this->render('music/beat_maker.html.twig');
    }

    /** AJAX — save a beat pattern from Beat Maker */
    #[Route('/beat-maker/save', name: 'app_music_beat_save', methods: ['POST'])]
    public function saveBeat(Request $request, EntityManagerInterface $em, GamificationService $gamification): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);

        $rec = new AcousticRecording();
        $rec->setUser($this->getUser());
        $rec->setInstrument($payload['instrument'] ?? 'beat_maker');
        $rec->setTitle($payload['title'] ?? 'Untitled Beat');
        $rec->setData(json_encode($payload['data'] ?? []));
        $rec->setDurationSeconds((int) ($payload['duration'] ?? 0));

        $em->persist($rec);
        $em->flush();

        // Award XP for saving a beat
        $gamification->award($this->getUser(), GamificationService::SAVE_MUSIC);

        return new JsonResponse(['success' => true, 'id' => $rec->getId()]);
    }

    // ─────────────────────────────────────────────
    //  INSTRUMENTS
    // ─────────────────────────────────────────────

    #[Route('/piano', name: 'app_music_piano')]
    public function piano(): Response
    {
        return $this->render('music/piano.html.twig');
    }

    #[Route('/guitar', name: 'app_music_guitar')]
    public function guitar(): Response
    {
        return $this->render('music/guitar.html.twig');
    }

    #[Route('/drums', name: 'app_music_drums')]
    public function drums(): Response
    {
        return $this->render('music/drums.html.twig');
    }

    // ─────────────────────────────────────────────
    //  AI TOOLS
    // ─────────────────────────────────────────────

    #[Route('/harmony', name: 'app_music_harmony')]
    public function harmony(): Response
    {
        return $this->render('music/harmony.html.twig');
    }

    #[Route('/rhythm-training', name: 'app_music_rhythm')]
    public function rhythmTraining(): Response
    {
        return $this->render('music/rhythm_training.html.twig');
    }

    // ─────────────────────────────────────────────
    //  RECORDINGS
    // ─────────────────────────────────────────────

    #[Route('/recordings', name: 'app_music_recordings')]
    public function recordings(AcousticRecordingRepository $repo): Response
    {
        return $this->render('music/recordings.html.twig', [
            'recordings' => $repo->findByUser($this->getUser()),
        ]);
    }

    /** AJAX — save a recording from an instrument page */
    #[Route('/recordings/save', name: 'app_music_recording_save', methods: ['POST'])]
    public function saveRecording(Request $request, EntityManagerInterface $em, GamificationService $gamification): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);

        $rec = new AcousticRecording();
        $rec->setUser($this->getUser());
        $rec->setInstrument($payload['instrument'] ?? 'piano');
        $rec->setTitle($payload['title'] ?? null);
        $rec->setData(json_encode($payload['data'] ?? []));
        $rec->setDurationSeconds((int) ($payload['duration'] ?? 0));

        $em->persist($rec);
        $em->flush();

        // Award XP for saving a recording
        $gamification->award($this->getUser(), GamificationService::SAVE_MUSIC);

        return new JsonResponse(['success' => true, 'id' => $rec->getId()]);
    }

    /** Delete a recording */
    #[Route('/recordings/{id}/delete', name: 'app_music_recording_delete', methods: ['POST'])]
    public function deleteRecording(int $id, AcousticRecordingRepository $repo, EntityManagerInterface $em): Response
    {
        $rec = $repo->find($id);
        if ($rec && $rec->getUser() === $this->getUser()) {
            $em->remove($rec);
            $em->flush();
            $this->addFlash('success', 'Recording deleted.');
        }
        return $this->redirectToRoute('app_music_recordings');
    }

    // ─────────────────────────────────────────────
    //  COMMUNITY TRACKS
    // ─────────────────────────────────────────────

    #[Route('/tracks', name: 'app_music_tracks')]
    public function tracks(Request $request, AcousticTrackRepository $repo): Response
    {
        $filters = [
            'title'  => $request->query->get('title'),
            'genre'  => $request->query->get('genre'),
            'minBpm' => $request->query->get('min_bpm'),
            'maxBpm' => $request->query->get('max_bpm'),
        ];

        return $this->render('music/tracks.html.twig', [
            'myTracks'        => $repo->findByUser($this->getUser()),
            'communityTracks' => $repo->findPublic($filters),
            'filters'         => $filters,
        ]);
    }

    /** Publish a recording as a community track */
    #[Route('/tracks/publish', name: 'app_music_track_publish', methods: ['POST'])]
    public function publishTrack(Request $request, AcousticRecordingRepository $recRepo, EntityManagerInterface $em): Response
    {
        $recId = (int) $request->request->get('recording_id');
        $rec   = $recRepo->find($recId);

        if (!$rec || $rec->getUser() !== $this->getUser()) {
            $this->addFlash('error', 'Recording not found.');
            return $this->redirectToRoute('app_music_tracks');
        }

        $track = new AcousticTrack();
        $track->setUser($this->getUser());
        $track->setTitle($request->request->get('title') ?: ($rec->getTitle() ?? 'Untitled'));
        $track->setGenre($request->request->get('genre') ?: null);
        $track->setBpm((int) $request->request->get('bpm') ?: null);
        $track->setInstrument($rec->getInstrument());
        $track->setNotesData($rec->getData());
        $track->setDurationSeconds($rec->getDurationSeconds());
        $track->setIsPublic((bool) $request->request->get('is_public', false));

        $em->persist($track);
        $em->flush();

        $this->addFlash('success', '🎵 Track published to the community!');
        return $this->redirectToRoute('app_music_tracks');
    }

    /** Toggle like on a community track */
    #[Route('/tracks/{id}/like', name: 'app_music_track_like', methods: ['POST'])]
    public function likeTrack(int $id, AcousticTrackRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $track = $repo->find($id);
        if (!$track) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }
        $track->incrementLikes();
        $em->flush();
        return new JsonResponse(['likes' => $track->getLikes()]);
    }

    /** Delete own track */
    #[Route('/tracks/{id}/delete', name: 'app_music_track_delete', methods: ['POST'])]
    public function deleteTrack(int $id, AcousticTrackRepository $repo, EntityManagerInterface $em): Response
    {
        $track = $repo->find($id);
        if ($track && $track->getUser() === $this->getUser()) {
            $em->remove($track);
            $em->flush();
            $this->addFlash('success', 'Track deleted.');
        }
        return $this->redirectToRoute('app_music_tracks');
    }
}
