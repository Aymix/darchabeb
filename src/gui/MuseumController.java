package gui;

import entities.Comment;
import entities.Drawing;
import javafx.animation.*;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.effect.DropShadow;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;
import javafx.util.Duration;
import services.ServiceComment;
import services.ServiceDrawing;
import services.ServiceDrawingLike;

import java.io.ByteArrayInputStream;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class MuseumController {

    @FXML private TilePane tile;
    @FXML private Pane sparkLayer;

    @FXML private TextField searchField;
    @FXML private TextField userIdField;
    @FXML private Label msgLabel;

    // comments panel
    @FXML private VBox commentsPane;
    @FXML private Label selectedTitleLabel;
    @FXML private Label selectedMetaLabel;
    @FXML private ListView<String> commentsList;
    @FXML private TextArea commentField;

    private final ServiceDrawing drawings = new ServiceDrawing();
    private final ServiceDrawingLike likes = new ServiceDrawingLike();
    private final ServiceComment comments = new ServiceComment();

    private List<Drawing> cached = new ArrayList<>();
    private Timeline sparkleTimeline;

    private Drawing selectedDrawing = null;

    @FXML
    public void initialize() {
        userIdField.setText("1"); // default
        refresh();
        startSparkles();
        setCommentsPanelEmpty();
    }

    @FXML
    public void refresh() {
        try {
            cached = drawings.getPublished();
            render(cached);
            msgLabel.setText("✨ Loaded " + cached.size());
        } catch (SQLException e) {
            e.printStackTrace();
            msgLabel.setText("DB error ❌");
        }
    }

    @FXML
    public void search() {
        String q = searchField.getText() == null ? "" : searchField.getText().trim().toLowerCase();
        if (q.isEmpty()) { render(cached); msgLabel.setText("Showing all ✨"); return; }

        List<Drawing> filtered = new ArrayList<>();
        for (Drawing d : cached) {
            String t = d.getTitle() == null ? "" : d.getTitle().toLowerCase();
            String ds = d.getDescription() == null ? "" : d.getDescription().toLowerCase();
            if (t.contains(q) || ds.contains(q)) filtered.add(d);
        }
        render(filtered);
        msgLabel.setText("Found " + filtered.size() + " 🔎");
    }

    private void render(List<Drawing> list) {
        tile.getChildren().clear();
        for (Drawing d : list) {
            tile.getChildren().add(makeCard(d));
        }
    }

    private Node makeCard(Drawing d) {
        VBox card = new VBox(10);
        card.setPadding(new Insets(14));
        card.setPrefWidth(300);
        card.setStyle("-fx-background-color:#161720; -fx-background-radius:18; -fx-border-radius:18; -fx-border-color:#24263a;");

        // glow effect
        DropShadow glow = new DropShadow();
        glow.setRadius(22);
        glow.setColor(Color.web("#f6d24a"));
        glow.setSpread(0.12);

        // preview image
        ImageView preview = new ImageView();
        preview.setFitWidth(270);
        preview.setFitHeight(170);
        preview.setPreserveRatio(false);
        preview.setSmooth(true);

        StackPane previewWrap = new StackPane(preview);
        previewWrap.setStyle("-fx-background-color:#22232a; -fx-background-radius:16; -fx-border-radius:16;");
        previewWrap.setPadding(new Insets(6));

        try {
            byte[] img = drawings.getImageBytes(d.getId()); // ok if null
            if (img != null && img.length > 0) {
                preview.setImage(new Image(new ByteArrayInputStream(img)));
            }
        } catch (Exception ignored) {}

        Label title = new Label("🎨 " + safe(d.getTitle()));
        title.setStyle("-fx-text-fill:#f6d24a; -fx-font-size:16px; -fx-font-weight:bold;");

        Label meta = new Label("🆔 " + d.getId() + "   •   👤 " + d.getUserId());
        meta.setStyle("-fx-text-fill:#bdbdbd; -fx-font-size:12px;");

        Label desc = new Label(safe(d.getDescription()));
        desc.setWrapText(true);
        desc.setStyle("-fx-text-fill:#eaeaea; -fx-font-size:12px;");

        // counts
        int likeCount = 0;
        int commentCount = 0;
        try { likeCount = likes.countLikes(d.getId()); } catch (Exception ignored) {}
        try { commentCount = comments.countComments(d.getId()); } catch (Exception ignored) {}

        Label counts = new Label("❤️ " + likeCount + "    💬 " + commentCount);
        counts.setStyle("-fx-text-fill:#eaeaea; -fx-font-size:12px; -fx-font-weight:bold;");

        // buttons
        Button likeBtn = new Button("❤️ Like");
        likeBtn.setStyle("-fx-background-color:#f6d24a; -fx-font-weight:bold; -fx-background-radius:14;");

        Button commentBtn = new Button("💬 Comments");
        commentBtn.setStyle("-fx-background-color:#22232a; -fx-text-fill:#ffffff; -fx-font-weight:bold; -fx-background-radius:14;");

        Button updateBtn = new Button("✏ Update");
        updateBtn.setStyle("-fx-background-color:#22232a; -fx-text-fill:#ffffff; -fx-font-weight:bold; -fx-background-radius:14;");

        Button deleteBtn = new Button("🗑 Delete");
        deleteBtn.setStyle("-fx-background-color:#b93838; -fx-text-fill:#ffffff; -fx-font-weight:bold; -fx-background-radius:14;");

        HBox row1 = new HBox(10, likeBtn, commentBtn);
        HBox row2 = new HBox(10, updateBtn, deleteBtn);

        // click actions
        likeBtn.setOnAction(e -> {
            Integer uid = getUserIdOrWarn();
            if (uid == null) return;

            try {
                likes.toggleLike(d.getId(), uid);
                // cute pulse
                pulse(likeBtn);
                refresh(); // refresh counts
                msgLabel.setText("❤️ Updated like!");
            } catch (SQLException ex) {
                ex.printStackTrace();
                msgLabel.setText("Like failed ❌");
            }
        });

        commentBtn.setOnAction(e -> {
            selectedDrawing = d;
            loadCommentsPanel(d);
            pulse(commentBtn);
        });

        updateBtn.setOnAction(e -> updateDrawing(d));
        deleteBtn.setOnAction(e -> deleteDrawing(d));

        // hover animation
        card.setOnMouseEntered(ev -> {
            card.setEffect(glow);
            ScaleTransition st = new ScaleTransition(Duration.millis(120), card);
            st.setToX(1.02); st.setToY(1.02); st.play();
        });
        card.setOnMouseExited(ev -> {
            card.setEffect(null);
            ScaleTransition st = new ScaleTransition(Duration.millis(120), card);
            st.setToX(1.0); st.setToY(1.0); st.play();
        });

        card.getChildren().addAll(previewWrap, title, meta, desc, counts, row1, row2);
        return card;
    }

    private void updateDrawing(Drawing d) {

        TextInputDialog t = new TextInputDialog(d.getTitle());
        t.setTitle("Virtuarts ✨");
        t.setHeaderText("✏ Update Title (ID " + d.getId() + ")");
        t.setContentText("Title:");

        String newTitle = t.showAndWait().orElse(null);
        if (newTitle == null) return;

        newTitle = newTitle.trim();

        // ✅ controle saisie (title)
        if (newTitle.isEmpty()) {
            msgLabel.setText("❌ Title required.");
            return;
        }
        if (newTitle.length() < 3) {
            msgLabel.setText("❌ Title too short (min 3).");
            return;
        }
        if (newTitle.length() > 40) {
            msgLabel.setText("❌ Title too long (max 40).");
            return;
        }

        TextInputDialog dd = new TextInputDialog(d.getDescription());
        dd.setTitle("Virtuarts ✨");
        dd.setHeaderText("✏ Update Description (ID " + d.getId() + ")");
        dd.setContentText("Description:");

        String newDesc = dd.showAndWait().orElse(null);
        if (newDesc == null) return;

        newDesc = newDesc.trim();

        // ✅ controle saisie (description)
        if (newDesc.length() > 250) {
            msgLabel.setText("❌ Description too long (max 250).");
            return;
        }

        try {
            // ✅ unique title check (excluding this drawing)
            if (drawings.titleExistsForOtherId(newTitle, d.getId())) {
                msgLabel.setText("❌ This title already exists. Choose another one ✨");
                return;
            }

            d.setTitle(newTitle);
            d.setDescription(newDesc);
            drawings.update(d);

            refresh();
            msgLabel.setText("Updated ✅");

        } catch (SQLException e) {
            // if DB UNIQUE(title) constraint exists, it may throw here too
            if ("DUPLICATE_TITLE".equals(e.getMessage())) {
                msgLabel.setText("❌ This title already exists. Choose another one ✨");
            } else {
                e.printStackTrace();
                msgLabel.setText("Update failed ❌");
            }
        }
    }

    private void deleteDrawing(Drawing d) {
        Alert a = new Alert(Alert.AlertType.CONFIRMATION);
        a.setTitle("Virtuarts");
        a.setHeaderText("🗑 Delete this sketch?");
        a.setContentText("ID " + d.getId() + " • " + safe(d.getTitle()));
        if (a.showAndWait().orElse(ButtonType.CANCEL) != ButtonType.OK) return;

        try {
            drawings.delete(d.getId());
            if (selectedDrawing != null && selectedDrawing.getId() == d.getId()) {
                clearSelection();
            }
            refresh();
            msgLabel.setText("Deleted ✅");
        } catch (SQLException e) {
            e.printStackTrace();
            msgLabel.setText("Delete failed ❌");
        }
    }

    // -------- comments panel --------
    private void loadCommentsPanel(Drawing d) {
        selectedTitleLabel.setText("💬 Comments • " + safe(d.getTitle()));
        selectedMetaLabel.setText("🆔 " + d.getId() + "   •   add your vibe ✨");

        try {
            List<Comment> list = comments.getByDrawingId(d.getId());
            List<String> ui = new ArrayList<>();
            for (Comment c : list) {
                String line = "👤 " + c.getUserId() + " • " + (c.getCreatedAt() != null ? c.getCreatedAt() : "") +
                        "\n" + c.getContent();
                ui.add(line);
            }
            commentsList.setItems(FXCollections.observableArrayList(ui));
        } catch (SQLException e) {
            e.printStackTrace();
            commentsList.setItems(FXCollections.observableArrayList("DB error loading comments ❌"));
        }
    }

    @FXML
    public void addComment() {
        if (selectedDrawing == null) {
            msgLabel.setText("Pick a sketch first 💬");
            return;
        }
        Integer uid = getUserIdOrWarn();
        if (uid == null) return;

        String text = commentField.getText();
        if (text == null || text.trim().isEmpty()) {
            msgLabel.setText("Write a comment ✨");
            return;
        }

        try {
            Comment c = new Comment();
            c.setDrawingId(selectedDrawing.getId());
            c.setUserId(uid);
            c.setCreatedAt(LocalDate.now());
            c.setContent(text.trim());
            comments.add(c);

            commentField.clear();
            loadCommentsPanel(selectedDrawing);
            refresh(); // update counts
            msgLabel.setText("Comment added ✅ 💬");
        } catch (SQLException e) {
            e.printStackTrace();
            msgLabel.setText("Comment failed ❌");
        }
    }

    @FXML
    public void clearSelection() {
        selectedDrawing = null;
        setCommentsPanelEmpty();
    }

    private void setCommentsPanelEmpty() {
        selectedTitleLabel.setText("💬 Comments");
        selectedMetaLabel.setText("Select a sketch and click 💬 Comments.");
        commentsList.setItems(FXCollections.observableArrayList("✨ No sketch selected."));
        commentField.clear();
    }

    // -------- sparkles --------
    private void startSparkles() {
        sparkleTimeline = new Timeline(new KeyFrame(Duration.millis(120), e -> spawnSpark()));
        sparkleTimeline.setCycleCount(Animation.INDEFINITE);
        sparkleTimeline.play();
    }

    private void spawnSpark() {
        if (sparkLayer == null) return;

        double w = sparkLayer.getWidth() > 0 ? sparkLayer.getWidth() : 1100;
        double h = sparkLayer.getHeight() > 0 ? sparkLayer.getHeight() : 700;

        Circle c = new Circle();
        c.setRadius(1 + Math.random() * 3);
        c.setCenterX(Math.random() * w);
        c.setCenterY(h - Math.random() * 40);
        c.setOpacity(0);

        DropShadow glow = new DropShadow();
        glow.setRadius(18);
        glow.setColor(Color.web("#f6d24a"));
        c.setEffect(glow);
        c.setFill(Color.web("#f6d24a"));

        sparkLayer.getChildren().add(c);

        FadeTransition fadeIn = new FadeTransition(Duration.millis(200), c);
        fadeIn.setFromValue(0);
        fadeIn.setToValue(0.9);

        TranslateTransition drift = new TranslateTransition(Duration.millis(1600), c);
        drift.setByY(-60 - Math.random() * 90);
        drift.setByX(-30 + Math.random() * 60);

        FadeTransition fadeOut = new FadeTransition(Duration.millis(1500), c);
        fadeOut.setFromValue(0.9);
        fadeOut.setToValue(0);

        ParallelTransition pt = new ParallelTransition(fadeIn, drift, fadeOut);
        pt.setOnFinished(ev -> sparkLayer.getChildren().remove(c));
        pt.play();
    }

    private void pulse(Node n) {
        ScaleTransition st = new ScaleTransition(Duration.millis(120), n);
        st.setToX(1.06); st.setToY(1.06);
        ScaleTransition back = new ScaleTransition(Duration.millis(120), n);
        back.setToX(1.0); back.setToY(1.0);
        new SequentialTransition(st, back).play();
    }

    private Integer getUserIdOrWarn() {
        String s = userIdField.getText();
        if (s == null || s.trim().isEmpty()) {
            msgLabel.setText("Enter User ID 👤");
            return null;
        }
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            msgLabel.setText("User ID must be a number 👤");
            return null;
        }
    }

    @FXML
    public void closeWindow() {
        Stage stage = (Stage) tile.getScene().getWindow();
        stage.close();
    }

    private String safe(String s) { return s == null ? "" : s; }
}