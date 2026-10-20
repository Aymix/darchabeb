package services;

import entities.Drawing;
import tools.MyConnection;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ServiceDrawing implements IService<Drawing> {

    private final Connection cnx = MyConnection.getInstance().getCnx();

    @Override
    public void add(Drawing d) throws SQLException {
        // normal add (without returning id)
        addAndReturnId(d);
    }

    // ✅ add + return generated id
    public int addAndReturnId(Drawing d) throws SQLException {
        String sql = "INSERT INTO drawing (title, description, created_at, user_id, published) VALUES (?, ?, ?, ?, 0)";
        try (PreparedStatement ps = cnx.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, d.getTitle());
            ps.setString(2, d.getDescription());
            ps.setDate(3, Date.valueOf(d.getCreatedAt()));
            ps.setInt(4, d.getUserId());
            ps.executeUpdate();

            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) return keys.getInt(1);
            }
            return -1;
        } catch (SQLIntegrityConstraintViolationException dup) {
            // because of UNIQUE(title)
            throw new SQLException("DUPLICATE_TITLE");
        }
    }

    @Override
    public void update(Drawing d) throws SQLException {
        String sql = "UPDATE drawing SET title=?, description=?, user_id=? WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, d.getTitle());
            ps.setString(2, d.getDescription());
            ps.setInt(3, d.getUserId());
            ps.setInt(4, d.getId());
            ps.executeUpdate();
        }
    }

    @Override
    public void delete(int id) throws SQLException {
        String sql = "DELETE FROM drawing WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    @Override
    public List<Drawing> getAll() throws SQLException {
        List<Drawing> list = new ArrayList<>();
        String sql = "SELECT id, title, description, created_at, user_id FROM drawing ORDER BY id DESC";

        try (Statement st = cnx.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                Drawing d = new Drawing();
                d.setId(rs.getInt("id"));
                d.setTitle(rs.getString("title"));
                d.setDescription(rs.getString("description"));
                Date dt = rs.getDate("created_at");
                d.setCreatedAt(dt != null ? dt.toLocalDate() : null);
                d.setUserId(rs.getInt("user_id"));
                list.add(d);
            }
        }
        return list;
    }

    @Override
    public Drawing getOne(int id) throws SQLException {
        String sql = "SELECT id, title, description, created_at, user_id FROM drawing WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;

                Drawing d = new Drawing();
                d.setId(rs.getInt("id"));
                d.setTitle(rs.getString("title"));
                d.setDescription(rs.getString("description"));
                Date dt = rs.getDate("created_at");
                d.setCreatedAt(dt != null ? dt.toLocalDate() : null);
                d.setUserId(rs.getInt("user_id"));
                return d;
            }
        }
    }

    // ✅ Save PNG bytes in DB
    public void updateImage(int drawingId, byte[] imageBytes) throws SQLException {
        String sql = "UPDATE drawing SET image=? WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setBytes(1, imageBytes);
            ps.setInt(2, drawingId);
            ps.executeUpdate();
        }
    }

    // ✅ Load PNG bytes for preview
    public byte[] getImageBytes(int drawingId) throws SQLException {
        String sql = "SELECT image FROM drawing WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                return rs.getBytes("image");
            }
        }
    }
    public void publish(int drawingId) throws SQLException {
        String sql = "UPDATE drawing SET published=1 WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            ps.executeUpdate();
        }
    }

    public List<Drawing> getPublished() throws SQLException {
        List<Drawing> list = new ArrayList<>();
        String sql = "SELECT id, title, description, created_at, user_id FROM drawing WHERE published=1 ORDER BY id DESC";
        try (Statement st = cnx.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                Drawing d = new Drawing();
                d.setId(rs.getInt("id"));
                d.setTitle(rs.getString("title"));
                d.setDescription(rs.getString("description"));
                Date dt = rs.getDate("created_at");
                d.setCreatedAt(dt != null ? dt.toLocalDate() : null);
                d.setUserId(rs.getInt("user_id"));
                list.add(d);
            }
        }
        return list;
    }
    public boolean titleExists(String title) throws SQLException {
        String sql = "SELECT 1 FROM drawing WHERE LOWER(title)=LOWER(?) LIMIT 1";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, title.trim());
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public boolean titleExistsForOtherId(String title, int id) throws SQLException {
        String sql = "SELECT 1 FROM drawing WHERE LOWER(title)=LOWER(?) AND id <> ? LIMIT 1";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, title.trim());
            ps.setInt(2, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }
}