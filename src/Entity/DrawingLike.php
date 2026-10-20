<?php

namespace App\Entity;

use App\Repository\DrawingLikeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DrawingLikeRepository::class)]
#[ORM\Table(name: 'drawing_like')]
class DrawingLike
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Drawing::class, inversedBy: 'likes')]
    #[ORM\JoinColumn(name: 'drawing_id', referencedColumnName: 'id')]
    private ?Drawing $drawing = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id')]
    private ?User $user = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDrawing(): ?Drawing
    {
        return $this->drawing;
    }

    public function setDrawing(?Drawing $drawing): static
    {
        $this->drawing = $drawing;
        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;
        return $this;
    }
}
