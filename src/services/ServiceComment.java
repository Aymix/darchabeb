package services;

import entities.Comment;
import tools.MyConnection;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ServiceComment implements IService<Comment> {

    private final Connection cnx = MyConnection.getInstance().getCnx();

    @Override
    public void add(Comment c) throws SQLException {
        String sql = "INSERT INTO drawing_comment (content, created_at, drawing_id, user_id) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, c.getContent());
            ps.setDate(2, Date.valueOf(c.getCreatedAt() != null ? c.getCreatedAt() : LocalDate.now()));
            ps.setInt(3, c.getDrawingId());
            ps.setInt(4, c.getUserId());
            ps.executeUpdate();
        }
    }

    @Override
    public void update(Comment c) throws SQLException {
        String sql = "UPDATE drawing_comment SET content=? WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, c.getContent());
            ps.setInt(2, c.getId());
            ps.executeUpdate();
        }
    }

    @Override
    public void delete(int id) throws SQLException {
        String sql = "DELETE FROM drawing_comment WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    @Override
    public List<Comment> getAll() throws SQLException {
        return getByDrawingId(-1);
    }

    @Override
    public Comment getOne(int id) throws SQLException {
        String sql = "SELECT id, content, created_at, drawing_id, user_id FROM drawing_comment WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                Comment c = new Comment();
                c.setId(rs.getInt("id"));
                c.setContent(rs.getString("content"));
                Date dt = rs.getDate("created_at");
                c.setCreatedAt(dt != null ? dt.toLocalDate() : null);
                c.setDrawingId(rs.getInt("drawing_id"));
                c.setUserId(rs.getInt("user_id"));
                return c;
            }
        }
    }

    public List<Comment> getByDrawingId(int drawingId) throws SQLException {
        List<Comment> list = new ArrayList<>();
        String sql = (drawingId < 0)
                ? "SELECT id, content, created_at, drawing_id, user_id FROM drawing_comment ORDER BY id DESC"
                : "SELECT id, content, created_at, drawing_id, user_id FROM drawing_comment WHERE drawing_id=? ORDER BY id DESC";

        if (drawingId < 0) {
            try (Statement st = cnx.createStatement();
                 ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) list.add(map(rs));
            }
        } else {
            try (PreparedStatement ps = cnx.prepareStatement(sql)) {
                ps.setInt(1, drawingId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) list.add(map(rs));
                }
            }
        }
        return list;
    }

    public int countComments(int drawingId) throws SQLException {
        String sql = "SELECT COUNT(*) AS c FROM drawing_comment WHERE drawing_id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt("c");
            }
        }
    }

    private Comment map(ResultSet rs) throws SQLException {
        Comment c = new Comment();
        c.setId(rs.getInt("id"));
        c.setContent(rs.getString("content"));
        Date dt = rs.getDate("created_at");
        c.setCreatedAt(dt != null ? dt.toLocalDate() : null);
        c.setDrawingId(rs.getInt("drawing_id"));
        c.setUserId(rs.getInt("user_id"));
        return c;
    }
}