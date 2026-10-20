package tools;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DataSource {

    private Connection cnx;
    private static DataSource instance;

    private String url = "jdbc:mysql://localhost:3306/virtuarts";
    private String user = "root";
    private String password = "";

    private DataSource() {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");  // 🔥 VERY IMPORTANT FOR JAVA 8

            cnx = DriverManager.getConnection(url, user, password);
            System.out.println("Connected to VirtuArts DB!");

        } catch (ClassNotFoundException e) {
            System.out.println("MySQL Driver not found!");
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }


    public static DataSource getInstance() {
        if (instance == null) {
            instance = new DataSource();
        }
        return instance;
    }

    public Connection getConnection() {
        return cnx;
    }
}
