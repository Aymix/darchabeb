package gui;

import entities.Drawing;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.stage.Stage;
import services.ServiceDrawing;

import java.sql.SQLException;
import java.util.List;

public class GalleryController {

    @FXML private TableView<Drawing> table;
    @FXML private TableColumn<Drawing, Integer> idCol;
    @FXML private TableColumn<Drawing, String> titleCol;
    @FXML private TableColumn<Drawing, Object> dateCol;
    @FXML private TableColumn<Drawing, Integer> userCol;
    @FXML private Label msgLabel;

    private final ServiceDrawing serviceDrawing = new ServiceDrawing();

    @FXML
    public void initialize() {
        idCol.setCellValueFactory(new PropertyValueFactory<>("id"));
        titleCol.setCellValueFactory(new PropertyValueFactory<>("title"));
        dateCol.setCellValueFactory(new PropertyValueFactory<>("createdAt"));
        userCol.setCellValueFactory(new PropertyValueFactory<>("userId"));

        refresh();
    }

    @FXML
    public void refresh() {
        try {
            List<Drawing> drawings = serviceDrawing.getAll();
            table.setItems(FXCollections.observableArrayList(drawings));
            msgLabel.setText("Loaded: " + drawings.size());
        } catch (SQLException e) {
            e.printStackTrace();
            msgLabel.setText("DB error ❌");
        }
    }

    @FXML
    public void deleteSelected() {
        Drawing selected = table.getSelectionModel().getSelectedItem();
        if (selected == null) {
            msgLabel.setText("Select a drawing first.");
            return;
        }

        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION);
        confirm.setTitle("Confirm Delete");
        confirm.setHeaderText("Delete drawing ID: " + selected.getId());
        confirm.setContentText("This will also delete related layers/tags/likes/comments (FK cascade).");

        if (confirm.showAndWait().orElse(ButtonType.CANCEL) != ButtonType.OK) return;

        try {
            serviceDrawing.delete(selected.getId());
            refresh();
            msgLabel.setText("Deleted ✅");
        } catch (SQLException e) {
            e.printStackTrace();
            msgLabel.setText("Delete failed ❌");
        }
    }

    @FXML
    public void closeWindow() {
        Stage stage = (Stage) table.getScene().getWindow();
        stage.close();
    }
}