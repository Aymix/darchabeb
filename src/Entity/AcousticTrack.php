<?php

namespace App\Entity;

use App\Repository\AcousticTrackRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AcousticTrackRepository::class)]
#[ORM\Table(name: 'acoustic_tracks')]
class AcousticTrack
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    private string $title = 'Untitled Track';

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $genre = null;

    #[ORM\Column(nullable: true)]
    private ?int $bpm = null;

    #[ORM\Column(length: 30)]
    private string $instrument = 'piano';

    /** JSON recording data for replay */
    #[ORM\Column(name: 'notes_data', type: Types::TEXT, nullable: true)]
    private ?string $notesData = null;

    #[ORM\Column(name: 'is_public', options: ['default' => false])]
    private bool $isPublic = false;

    #[ORM\Column(options: ['default' => 0])]
    private int $likes = 0;

    #[ORM\Column(name: 'duration_seconds', nullable: true)]
    private ?int $durationSeconds = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $u): static { $this->user = $u; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $t): static { $this->title = $t; return $this; }

    public function getGenre(): ?string { return $this->genre; }
    public function setGenre(?string $g): static { $this->genre = $g; return $this; }

    public function getBpm(): ?int { return $this->bpm; }
    public function setBpm(?int $b): static { $this->bpm = $b; return $this; }

    public function getInstrument(): string { return $this->instrument; }
    public function setInstrument(string $i): static { $this->instrument = $i; return $this; }

    public function getNotesData(): ?string { return $this->notesData; }
    public function setNotesData(?string $d): static { $this->notesData = $d; return $this; }

    public function isPublic(): bool { return $this->isPublic; }
    public function setIsPublic(bool $p): static { $this->isPublic = $p; return $this; }

    public function getLikes(): int { return $this->likes; }
    public function setLikes(int $l): static { $this->likes = $l; return $this; }
    public function incrementLikes(): static { $this->likes++; return $this; }

    public function getDurationSeconds(): ?int { return $this->durationSeconds; }
    public function setDurationSeconds(?int $d): static { $this->durationSeconds = $d; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    public function getInstrumentEmoji(): string
    {
        return match ($this->instrument) {
            'piano'  => '🎹',
            'guitar' => '🎸',
            'drums'  => '🥁',
            'beat'   => '🎧',
            default  => '🎵',
        };
    }
}
