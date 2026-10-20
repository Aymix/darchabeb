package services;

import entities.Tag;
import tools.MyConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import services.SketchBoardService;
public class ServiceTag implements IService<Tag> {

    private final Connection cnx = MyConnection.getInstance().getCnx();

    @Override
    public void add(Tag t) throws SQLException {
        String sql = "INSERT INTO tag (name) VALUES (?)";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, t.getName());
            ps.executeUpdate();
        }
    }

    @Override
    public void update(Tag t) throws SQLException {
        String sql = "UPDATE tag SET name=? WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, t.getName());
            ps.setInt(2, t.getId());
            ps.executeUpdate();
        }
    }

    @Override
    public void delete(int id) throws SQLException {
        String sql = "DELETE FROM tag WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    @Override
    public List<Tag> getAll() throws SQLException {
        List<Tag> list = new ArrayList<>();
        String sql = "SELECT * FROM tag";

        try (Statement st = cnx.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                Tag t = new Tag();
                t.setId(rs.getInt("id"));
                t.setName(rs.getString("name"));
                list.add(t);
            }
        }
        return list;
    }

    @Override
    public Tag getOne(int id) throws SQLException {
        String sql = "SELECT * FROM tag WHERE id=?";

        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;

                Tag t = new Tag();
                t.setId(rs.getInt("id"));
                t.setName(rs.getString("name"));
                return t;
            }
        }
    }

    // -------- join table drawing_tag --------
    public void addTagToDrawing(int drawingId, int tagId) throws SQLException {
        String sql = "INSERT INTO drawing_tag (drawing_id, tag_id) VALUES (?, ?)";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            ps.setInt(2, tagId);
            ps.executeUpdate();
        }
    }

    public void removeTagFromDrawing(int drawingId, int tagId) throws SQLException {
        String sql = "DELETE FROM drawing_tag WHERE drawing_id=? AND tag_id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            ps.setInt(2, tagId);
            ps.executeUpdate();
        }
    }

    public List<Tag> getTagsByDrawingId(int drawingId) throws SQLException {
        List<Tag> list = new ArrayList<>();

        // If your join table name is different, change ONLY "drawing_tag" below.
        String sql = "SELECT t.id, t.name " +
                "FROM tag t " +
                "JOIN drawing_tag dt ON dt.tag_id = t.id " +
                "WHERE dt.drawing_id = ?";

        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Tag t = new Tag();
                    t.setId(rs.getInt("id"));
                    t.setName(rs.getString("name"));
                    list.add(t);
                }
            }
        }

        return list;
    }
}