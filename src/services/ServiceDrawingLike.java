package services;

import entities.DrawingLike;
import tools.MyConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ServiceDrawingLike implements IService<DrawingLike> {

    private final Connection cnx = MyConnection.getInstance().getCnx();

    @Override
    public void add(DrawingLike like) throws SQLException {
        String sql = "INSERT INTO drawing_like (drawing_id, user_id) VALUES (?, ?)";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, like.getDrawingId());
            ps.setInt(2, like.getUserId());
            ps.executeUpdate();
        }
    }

    @Override
    public void update(DrawingLike drawingLike) throws SQLException {
        throw new UnsupportedOperationException("Like cannot be updated.");
    }

    @Override
    public void delete(int id) throws SQLException {
        String sql = "DELETE FROM drawing_like WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    @Override
    public List<DrawingLike> getAll() throws SQLException {
        List<DrawingLike> list = new ArrayList<>();
        String sql = "SELECT id, drawing_id, user_id FROM drawing_like";
        try (Statement st = cnx.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                DrawingLike l = new DrawingLike();
                l.setId(rs.getInt("id"));
                l.setDrawingId(rs.getInt("drawing_id"));
                l.setUserId(rs.getInt("user_id"));
                list.add(l);
            }
        }
        return list;
    }

    @Override
    public DrawingLike getOne(int id) throws SQLException {
        String sql = "SELECT id, drawing_id, user_id FROM drawing_like WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                DrawingLike l = new DrawingLike();
                l.setId(rs.getInt("id"));
                l.setDrawingId(rs.getInt("drawing_id"));
                l.setUserId(rs.getInt("user_id"));
                return l;
            }
        }
    }

    public boolean hasLiked(int drawingId, int userId) throws SQLException {
        String sql = "SELECT 1 FROM drawing_like WHERE drawing_id=? AND user_id=? LIMIT 1";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            ps.setInt(2, userId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public void toggleLike(int drawingId, int userId) throws SQLException {
        if (hasLiked(drawingId, userId)) {
            deleteByDrawingAndUser(drawingId, userId);
        } else {
            DrawingLike like = new DrawingLike();
            like.setDrawingId(drawingId);
            like.setUserId(userId);
            add(like);
        }
    }

    public void deleteByDrawingAndUser(int drawingId, int userId) throws SQLException {
        String sql = "DELETE FROM drawing_like WHERE drawing_id=? AND user_id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            ps.setInt(2, userId);
            ps.executeUpdate();
        }
    }

    public int countLikes(int drawingId) throws SQLException {
        String sql = "SELECT COUNT(*) AS c FROM drawing_like WHERE drawing_id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt("c");
            }
        }
    }
}