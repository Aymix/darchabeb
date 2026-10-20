package gui;

import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.control.ColorPicker;
import javafx.scene.control.Label;
import javafx.scene.control.Slider;
import javafx.scene.paint.Color;
import javafx.stage.Modality;
import javafx.stage.Stage;
import services.SketchBoardService;

import java.io.IOException;

public class MainController {

    @FXML private Canvas canvas;
    @FXML private ColorPicker colorPicker;
    @FXML private Slider sizeSlider;
    @FXML private Label statusLabel;

    private final SketchBoardService boardService = new SketchBoardService();

    @FXML
    public void initialize() {
        boardService.attach(canvas, overlayCanvas);

        colorPicker.setValue(Color.BLACK);
        colorPicker.valueProperty().addListener((obs, o, n) -> boardService.setColor(n));

        sizeSlider.setValue(4);
        sizeSlider.valueProperty().addListener((obs, o, n) -> boardService.setSize(n.doubleValue()));
        if (glowToggle != null) {
            glowToggle.setSelected(true);
        }

        if (sparkToggle != null) {
            sparkToggle.setSelected(true);
            startSparkles();
            sparkToggle.selectedProperty().addListener((obs, o, on) -> {
                if (on) startSparkles();
                else stopSparkles();
            });
        }

        statusLabel.setText("Drawing Studio • Ready");
    }

    @FXML public void undo() { boardService.undo(); statusLabel.setText("Undo"); }
    @FXML public void redo() { boardService.redo(); statusLabel.setText("Redo"); }
    @FXML public void clear() { boardService.clear(); statusLabel.setText("Cleared"); }

    @FXML
    public void usePencil() {
        boardService.setColor(colorPicker.getValue());
        statusLabel.setText("Tool: Pencil");
    }

    @FXML
    public void useEraser() {
        boardService.setColor(Color.WHITE);
        statusLabel.setText("Tool: Eraser");
    }

    @FXML
    public void openSaveDialog() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("SaveDialog.fxml"));
            Stage stage = new Stage();
            stage.initModality(Modality.APPLICATION_MODAL);
            stage.setTitle("Virtuarts • Save Drawing");
            stage.setScene(new Scene(loader.load()));

            SaveDialogController controller = loader.getController();
            controller.setBoardService(boardService);

            stage.showAndWait();
        } catch (IOException e) {
            e.printStackTrace();
            statusLabel.setText("Error opening Save dialog ❌");
        }
    }

    @FXML
    public void openGallery() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("Gallery.fxml"));
            Stage stage = new Stage();
            stage.setTitle("Virtuarts • Gallery");
            stage.setScene(new Scene(loader.load()));
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            statusLabel.setText("Error opening Gallery ❌");
        }
    }
    @FXML
    public void openMuseum() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("Museum.fxml"));
            Stage stage = new Stage();
            stage.setTitle("Virtuarts • Museum");
            stage.setScene(new Scene(loader.load()));
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            if (statusLabel != null) statusLabel.setText("Error opening Museum ❌");
        }
    }
    @FXML private Canvas overlayCanvas;

    @FXML
    public void useLine() {
        boardService.setTool(SketchBoardService.Tool.LINE); statusLabel.setText("Tool: 📏 Line");
    }
    @FXML
    public void useRect() {
        boardService.setTool(SketchBoardService.Tool.RECT); statusLabel.setText("Tool: ⬛ Rectangle");
    }
    @FXML
    public void useCircle() {
        boardService.setTool(SketchBoardService.Tool.CIRCLE); statusLabel.setText("Tool: ⚪ Circle");
    }
    @FXML private javafx.scene.layout.Pane sparkLayer;
    @FXML private javafx.scene.control.CheckBox glowToggle;
    @FXML private javafx.scene.control.CheckBox sparkToggle;

    private javafx.animation.Timeline sparkleTimeline;
    private void startSparkles() {
        if (sparkLayer == null) return;

        if (sparkleTimeline != null) sparkleTimeline.stop();

        sparkleTimeline = new javafx.animation.Timeline(
                new javafx.animation.KeyFrame(javafx.util.Duration.millis(120), e -> spawnSpark())
        );
        sparkleTimeline.setCycleCount(javafx.animation.Animation.INDEFINITE);
        sparkleTimeline.play();
    }

    private void stopSparkles() {
        if (sparkleTimeline != null) sparkleTimeline.stop();
        if (sparkLayer != null) sparkLayer.getChildren().clear();
    }

    private void spawnSpark() {
        if (sparkLayer == null) return;

        double w = sparkLayer.getWidth() > 0 ? sparkLayer.getWidth() : 1000;
        double h = sparkLayer.getHeight() > 0 ? sparkLayer.getHeight() : 600;

        javafx.scene.shape.Circle c = new javafx.scene.shape.Circle();
        c.setRadius(1 + Math.random() * 3);
        c.setCenterX(Math.random() * w);
        c.setCenterY(h - Math.random() * 30);
        c.setOpacity(0);

        javafx.scene.effect.DropShadow glow = new javafx.scene.effect.DropShadow();
        glow.setRadius(18);
        glow.setColor(javafx.scene.paint.Color.web("#f6d24a"));
        c.setEffect(glow);
        c.setFill(javafx.scene.paint.Color.web("#f6d24a"));

        sparkLayer.getChildren().add(c);

        javafx.animation.FadeTransition fadeIn = new javafx.animation.FadeTransition(javafx.util.Duration.millis(200), c);
        fadeIn.setFromValue(0);
        fadeIn.setToValue(0.9);

        javafx.animation.TranslateTransition drift = new javafx.animation.TranslateTransition(javafx.util.Duration.millis(1500), c);
        drift.setByY(-70 - Math.random() * 60);
        drift.setByX(-30 + Math.random() * 60);

        javafx.animation.FadeTransition fadeOut = new javafx.animation.FadeTransition(javafx.util.Duration.millis(1500), c);
        fadeOut.setFromValue(0.9);
        fadeOut.setToValue(0);

        javafx.animation.ParallelTransition pt = new javafx.animation.ParallelTransition(fadeIn, drift, fadeOut);
        pt.setOnFinished(ev -> sparkLayer.getChildren().remove(c));
        pt.play();
    }

}