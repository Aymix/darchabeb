package entities;

public class Layer {
    private int id;
    private String name;
    private int drawingId;
    private int orderIndex;
    private boolean visible;

    public Layer() {}

    public Layer(int id, String name, int drawingId, int orderIndex, boolean visible) {
        this.id = id;
        this.name = name;
        this.drawingId = drawingId;
        this.orderIndex = orderIndex;
        this.visible = visible;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getDrawingId() { return drawingId; }
    public void setDrawingId(int drawingId) { this.drawingId = drawingId; }

    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }

    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
}