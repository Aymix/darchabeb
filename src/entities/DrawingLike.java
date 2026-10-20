package entities;

public class DrawingLike {
    private int id;
    private int drawingId;
    private int userId;

    public DrawingLike() {}

    public DrawingLike(int id, int drawingId, int userId) {
        this.id = id;
        this.drawingId = drawingId;
        this.userId = userId;
    }

    public DrawingLike(int drawingId, int userId) {
        this.drawingId = drawingId;
        this.userId = userId;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getDrawingId() { return drawingId; }
    public void setDrawingId(int drawingId) { this.drawingId = drawingId; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }
}