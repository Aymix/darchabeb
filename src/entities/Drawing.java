package entities;

import java.time.LocalDate;

public class Drawing {
    private int id;
    private String title;
    private String description;
    private LocalDate createdAt;
    private int userId;

    // Optional: if you add image later
    // private byte[] image;

    public Drawing() {}

    public Drawing(int id, String title, String description, LocalDate createdAt, int userId) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.createdAt = createdAt;
        this.userId = userId;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDate getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDate createdAt) { this.createdAt = createdAt; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }
}