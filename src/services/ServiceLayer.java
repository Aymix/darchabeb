package services;

import entities.Layer;
import tools.MyConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import services.SketchBoardService;
public class ServiceLayer implements IService<Layer> {

    private final Connection cnx = MyConnection.getInstance().getCnx();

    @Override
    public void add(Layer l) throws SQLException {
        String sql = "INSERT INTO layer (name, drawing_id, order_index, visible) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, l.getName());
            ps.setInt(2, l.getDrawingId());
            ps.setInt(3, l.getOrderIndex());
            ps.setBoolean(4, l.isVisible());
            ps.executeUpdate();
        }
    }

    @Override
    public void update(Layer l) throws SQLException {
        String sql = "UPDATE layer SET name=?, drawing_id=?, order_index=?, visible=? WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setString(1, l.getName());
            ps.setInt(2, l.getDrawingId());
            ps.setInt(3, l.getOrderIndex());
            ps.setBoolean(4, l.isVisible());
            ps.setInt(5, l.getId());
            ps.executeUpdate();
        }
    }

    @Override
    public void delete(int id) throws SQLException {
        String sql = "DELETE FROM layer WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    @Override
    public List<Layer> getAll() throws SQLException {
        List<Layer> list = new ArrayList<>();
        String sql = "SELECT id, name, drawing_id, order_index, visible FROM layer";

        try (Statement st = cnx.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                Layer l = new Layer();
                l.setId(rs.getInt("id"));
                l.setName(rs.getString("name"));
                l.setDrawingId(rs.getInt("drawing_id"));
                l.setOrderIndex(rs.getInt("order_index"));
                l.setVisible(rs.getBoolean("visible"));
                list.add(l);
            }
        }
        return list;
    }

    @Override
    public Layer getOne(int id) throws SQLException {
        String sql = "SELECT id, name, drawing_id, order_index, visible FROM layer WHERE id=?";
        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, id);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;

                Layer l = new Layer();
                l.setId(rs.getInt("id"));
                l.setName(rs.getString("name"));
                l.setDrawingId(rs.getInt("drawing_id"));
                l.setOrderIndex(rs.getInt("order_index"));
                l.setVisible(rs.getBoolean("visible"));
                return l;
            }
        }
    }

    public List<Layer> getByDrawingId(int drawingId) throws SQLException {
        List<Layer> list = new ArrayList<>();
        String sql = "SELECT id, name, drawing_id, order_index, visible FROM layer WHERE drawing_id=? ORDER BY order_index ASC";

        try (PreparedStatement ps = cnx.prepareStatement(sql)) {
            ps.setInt(1, drawingId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Layer l = new Layer();
                    l.setId(rs.getInt("id"));
                    l.setName(rs.getString("name"));
                    l.setDrawingId(rs.getInt("drawing_id"));
                    l.setOrderIndex(rs.getInt("order_index"));
                    l.setVisible(rs.getBoolean("visible"));
                    list.add(l);
                }
            }
        }
        return list;
    }
}