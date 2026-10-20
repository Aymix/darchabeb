<?php

namespace App\Entity;

use App\Repository\AcousticRecordingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AcousticRecordingRepository::class)]
#[ORM\Table(name: 'acoustic_recordings')]
class AcousticRecording
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** piano | guitar | drums | beat */
    #[ORM\Column(length: 30)]
    private string $instrument = 'piano';

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $title = null;

    /** JSON array of {note/chord/hit, time} events */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $data = null;

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

    public function getInstrument(): string { return $this->instrument; }
    public function setInstrument(string $i): static { $this->instrument = $i; return $this; }

    public function getTitle(): ?string { return $this->title; }
    public function setTitle(?string $t): static { $this->title = $t; return $this; }

    public function getData(): ?string { return $this->data; }
    public function setData(?string $d): static { $this->data = $d; return $this; }

    public function getDataDecoded(): array
    {
        return $this->data ? (json_decode($this->data, true) ?? []) : [];
    }

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
