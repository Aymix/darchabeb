package entities;

import java.time.LocalDate;

public class Comment {
    private int id;
    private String content;
    private LocalDate createdAt;
    private int drawingId;
    private int userId;

    public Comment() {}

    public Comment(int id, String content, LocalDate createdAt, int drawingId, int userId) {
        this.id = id;
        this.content = content;
        this.createdAt = createdAt;
        this.drawingId = drawingId;
        this.userId = userId;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDate getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDate createdAt) { this.createdAt = createdAt; }

    public int getDrawingId() { return drawingId; }
    public void setDrawingId(int drawingId) { this.drawingId = drawingId; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }
}