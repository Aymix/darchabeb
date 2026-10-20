package services;

import javafx.embed.swing.SwingFXUtils;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.image.WritableImage;
import javafx.scene.input.MouseEvent;
import javafx.scene.paint.Color;

import javax.imageio.ImageIO;
import java.io.*;
import java.util.ArrayDeque;
import java.util.Deque;

public class SketchBoardService {

    public enum Tool { PENCIL, ERASER, LINE, RECT, CIRCLE }

    private Canvas canvas;
    private Canvas overlay;
    private GraphicsContext gc;
    private GraphicsContext ogc;

    private Color color = Color.BLACK;
    private double size = 4.0;
    private Tool tool = Tool.PENCIL;

    private double startX, startY;

    private final Deque<WritableImage> undoStack = new ArrayDeque<>();
    private final Deque<WritableImage> redoStack = new ArrayDeque<>();

    public void attach(Canvas canvas, Canvas overlayCanvas) {
        this.canvas = canvas;
        this.overlay = overlayCanvas;
        this.gc = canvas.getGraphicsContext2D();
        this.ogc = overlayCanvas.getGraphicsContext2D();

        clear();

        canvas.addEventHandler(MouseEvent.MOUSE_PRESSED, e -> {
            saveUndoSnapshot();
            startX = e.getX();
            startY = e.getY();

            if (tool == Tool.PENCIL || tool == Tool.ERASER) {
                gc.setStroke(tool == Tool.ERASER ? Color.WHITE : color);
                gc.setLineWidth(size);
                gc.beginPath();
                gc.moveTo(startX, startY);
                gc.stroke();
            }
        });

        canvas.addEventHandler(MouseEvent.MOUSE_DRAGGED, e -> {
            double x = e.getX();
            double y = e.getY();

            if (tool == Tool.PENCIL || tool == Tool.ERASER) {
                gc.lineTo(x, y);
                gc.stroke();
                return;
            }

            // Shapes preview on overlay
            clearOverlay();
            ogc.setStroke(color);
            ogc.setLineWidth(Math.max(1, size));
            ogc.setLineDashes(6);

            if (tool == Tool.LINE) {
                ogc.strokeLine(startX, startY, x, y);
            } else if (tool == Tool.RECT) {
                double w = x - startX;
                double h = y - startY;
                ogc.strokeRect(Math.min(startX, x), Math.min(startY, y), Math.abs(w), Math.abs(h));
            } else if (tool == Tool.CIRCLE) {
                double r = Math.hypot(x - startX, y - startY);
                ogc.strokeOval(startX - r, startY - r, 2 * r, 2 * r);
            }
        });

        canvas.addEventHandler(MouseEvent.MOUSE_RELEASED, e -> {
            double x = e.getX();
            double y = e.getY();

            if (tool == Tool.PENCIL || tool == Tool.ERASER) {
                gc.closePath();
                return;
            }

            // Commit shape to base canvas
            clearOverlay();
            gc.setStroke(color);
            gc.setLineWidth(Math.max(1, size));
            gc.setLineDashes(null);

            if (tool == Tool.LINE) {
                gc.strokeLine(startX, startY, x, y);
            } else if (tool == Tool.RECT) {
                double w = x - startX;
                double h = y - startY;
                gc.strokeRect(Math.min(startX, x), Math.min(startY, y), Math.abs(w), Math.abs(h));
            } else if (tool == Tool.CIRCLE) {
                double r = Math.hypot(x - startX, y - startY);
                gc.strokeOval(startX - r, startY - r, 2 * r, 2 * r);
            }
        });
    }

    public void setTool(Tool tool) { this.tool = tool; }
    public void setColor(Color color) { this.color = color; }
    public void setSize(double size) { this.size = size; }

    public void clear() {
        gc.setFill(Color.WHITE);
        gc.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
        clearOverlay();
        undoStack.clear();
        redoStack.clear();
    }

    public void undo() {
        if (undoStack.isEmpty()) return;
        redoStack.push(snapshot());
        gc.drawImage(undoStack.pop(), 0, 0);
    }

    public void redo() {
        if (redoStack.isEmpty()) return;
        undoStack.push(snapshot());
        gc.drawImage(redoStack.pop(), 0, 0);
    }

    public void exportPng(File file) throws IOException {
        WritableImage img = snapshot();
        ImageIO.write(SwingFXUtils.fromFXImage(img, null), "png", file);
    }

    public byte[] exportPngBytes() throws IOException {
        WritableImage img = snapshot();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ImageIO.write(SwingFXUtils.fromFXImage(img, null), "png", bos);
        return bos.toByteArray();
    }

    private void saveUndoSnapshot() {
        undoStack.push(snapshot());
        redoStack.clear();
    }

    private WritableImage snapshot() {
        WritableImage img = new WritableImage((int) canvas.getWidth(), (int) canvas.getHeight());
        canvas.snapshot(null, img);
        return img;
    }

    private void clearOverlay() {
        ogc.clearRect(0, 0, overlay.getWidth(), overlay.getHeight());
        ogc.setLineDashes(null);
    }
}