<?php

namespace App\Entity;

use App\Repository\StoryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: StoryRepository::class)]
#[ORM\Table(name: 'story')]
#[Vich\Uploadable]
class Story
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\NotBlank]
    private ?string $title = null;

    /** @deprecated Use the genres ManyToMany relation instead */
    #[ORM\Column(length: 100, nullable: true)]
    private ?string $genre = null;

    #[ORM\ManyToMany(targetEntity: Genre::class, inversedBy: 'stories')]
    #[ORM\JoinTable(name: 'story_genre')]
    private Collection $genres;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $status = null;

    #[ORM\Column(name: 'cover_image', length: 255, nullable: true)]
    private ?string $coverImage = null;

    #[Vich\UploadableField(mapping: 'story_cover', fileNameProperty: 'coverImage')]
    private ?File $coverFile = null;

    #[ORM\Column(length: 128, unique: true, nullable: true)]
    #[Gedmo\Slug(fields: ['title'])]
    private ?string $slug = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Gedmo\Timestampable(on: 'create')]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Gedmo\Timestampable(on: 'update')]
    private ?\DateTimeInterface $updatedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $content = null;

    #[ORM\OneToMany(targetEntity: Chapter::class, mappedBy: 'story', cascade: ['persist', 'remove'])]
    #[ORM\OrderBy(['orderIndex' => 'ASC'])]
    private Collection $chapters;

    public function __construct()
    {
        $this->chapters = new ArrayCollection();
        $this->genres = new ArrayCollection();
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): static
    {
        $this->title = $title;
        return $this;
    }

    /** @deprecated Use getGenres() instead */
    public function getGenre(): ?string
    {
        return $this->genre;
    }

    /** @deprecated Use addGenre()/removeGenre() instead */
    public function setGenre(?string $genre): static
    {
        $this->genre = $genre;
        return $this;
    }

    /** @return Collection<int, Genre> */
    public function getGenres(): Collection
    {
        return $this->genres;
    }

    public function addGenre(Genre $genre): static
    {
        if (!$this->genres->contains($genre)) {
            $this->genres->add($genre);
        }
        return $this;
    }

    public function removeGenre(Genre $genre): static
    {
        $this->genres->removeElement($genre);
        return $this;
    }

    /** Helper: comma-separated genre names for display */
    public function getGenreNames(): string
    {
        if ($this->genres->isEmpty()) {
            return $this->genre ?? 'General';
        }
        return implode(', ', $this->genres->map(fn(Genre $g) => $g->getName())->toArray());
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(?string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getCoverImage(): ?string
    {
        return $this->coverImage;
    }

    public function setCoverImage(?string $coverImage): static
    {
        $this->coverImage = $coverImage;
        return $this;
    }

    public function getCoverFile(): ?File { return $this->coverFile; }
    public function setCoverFile(?File $file): static {
        $this->coverFile = $file;
        if ($file) { $this->updatedAt = new \DateTime(); }
        return $this;
    }

    public function getSlug(): ?string { return $this->slug; }

    public function getCreatedAt(): ?\DateTimeInterface { return $this->createdAt; }

    public function getUpdatedAt(): ?\DateTimeInterface { return $this->updatedAt; }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): static
    {
        $this->content = $content;
        return $this;
    }

    /** @return Collection<int, Chapter> */
    public function getChapters(): Collection
    {
        return $this->chapters;
    }

    public function addChapter(Chapter $chapter): static
    {
        if (!$this->chapters->contains($chapter)) {
            $this->chapters->add($chapter);
            $chapter->setStory($this);
        }
        return $this;
    }

    public function __toString(): string
    {
        return $this->title ?? '';
    }
}
