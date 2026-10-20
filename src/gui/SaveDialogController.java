package gui;

import entities.Drawing;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import services.ServiceDrawing;
import services.SketchBoardService;

import java.io.File;
import java.sql.SQLException;
import java.time.LocalDate;

public class SaveDialogController {

    @FXML private TextField titleField;
    @FXML private TextArea descField;
    @FXML private TextField userIdField;
    @FXML private Label msgLabel;

    private SketchBoardService boardService;
    private Integer lastSavedId = null;

    public void setBoardService(SketchBoardService boardService) {
        this.boardService = boardService;
    }

    @FXML
    public void saveToDatabase() {
        if (boardService == null) {
            msgLabel.setText("Board service not set ❌");
            return;
        }

        try {
            ServiceDrawing sd = new ServiceDrawing();
            Integer id = saveDraft(sd);
            if (id == null) return;

            lastSavedId = id;
            msgLabel.setText("Saved ✅ Draft (Hidden) • ID " + id);

        } catch (SQLException e) {
            if ("DUPLICATE_TITLE".equals(e.getMessage())) {
                msgLabel.setText("❌ Title already exists. Choose another one ✨");
            } else {
                e.printStackTrace();
                msgLabel.setText("DB error ❌");
            }
        } catch (Exception e) {
            e.printStackTrace();
            msgLabel.setText("Save failed ❌");
        }
    }

    @FXML
    public void submitSketch() {
        if (boardService == null) {
            msgLabel.setText("Board service not set ❌");
            return;
        }

        try {
            ServiceDrawing sd = new ServiceDrawing();

            if (lastSavedId == null) {
                Integer id = saveDraft(sd);
                if (id == null) return;
                lastSavedId = id;
            }

            sd.publish(lastSavedId);
            msgLabel.setText("🚀 Submitted ✅ Visible in Museum • ID " + lastSavedId);

        } catch (SQLException e) {
            if ("DUPLICATE_TITLE".equals(e.getMessage())) {
                msgLabel.setText("❌ Title already exists. Choose another one ✨");
            } else {
                e.printStackTrace();
                msgLabel.setText("DB error ❌");
            }
        } catch (Exception e) {
            e.printStackTrace();
            msgLabel.setText("Submit failed ❌");
        }
    }

    private Integer saveDraft(ServiceDrawing sd) throws Exception {
        String title = titleField.getText() == null ? "" : titleField.getText().trim();
        String desc  = descField.getText() == null ? "" : descField.getText().trim();
        String userT = userIdField.getText() == null ? "" : userIdField.getText().trim();

        // ✅ controle de saisie
        if (title.isEmpty()) { msgLabel.setText("Title is required ✍️"); return null; }
        if (title.length() < 3) { msgLabel.setText("Title too short (min 3)"); return null; }
        if (title.length() > 40) { msgLabel.setText("Title too long (max 40)"); return null; }

        if (desc.length() > 250) { msgLabel.setText("Description too long (max 250)"); return null; }

        if (userT.isEmpty()) { msgLabel.setText("User ID is required 👤"); return null; }

        int userId;
        try {
            userId = Integer.parseInt(userT);
        } catch (NumberFormatException e) {
            msgLabel.setText("User ID must be a number 👤");
            return null;
        }
        if (userId <= 0) { msgLabel.setText("User ID must be > 0 👤"); return null; }

        // ✅ unique title check (friendly)
        if (sd.titleExists(title)) {
            msgLabel.setText("❌ Title already used. Try: " + title + " (v2) ✨");
            return null;
        }

        Drawing d = new Drawing();
        d.setTitle(title);
        d.setDescription(desc);
        d.setCreatedAt(LocalDate.now());
        d.setUserId(userId);

        int newId = sd.addAndReturnId(d); // can throw DUPLICATE_TITLE if race condition
        if (newId <= 0) { msgLabel.setText("Could not create drawing ❌"); return null; }

        byte[] png = boardService.exportPngBytes();
        sd.updateImage(newId, png);

        return newId;
    }

    @FXML
    public void exportPng() {
        try {
            if (boardService == null) {
                msgLabel.setText("Board service not set ❌");
                return;
            }
            FileChooser fc = new FileChooser();
            fc.getExtensionFilters().add(new FileChooser.ExtensionFilter("PNG Image", "*.png"));
            File f = fc.showSaveDialog(getStage());
            if (f == null) return;

            boardService.exportPng(f);
            msgLabel.setText("Exported PNG ✅");
        } catch (Exception e) {
            e.printStackTrace();
            msgLabel.setText("Export error ❌");
        }
    }

    @FXML
    public void close() {
        getStage().close();
    }

    private Stage getStage() {
        return (Stage) titleField.getScene().getWindow();
    }
}