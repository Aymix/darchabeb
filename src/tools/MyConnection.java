package tools;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class MyConnection {

    private static MyConnection instance;
    private Connection cnx;

    private final String URL = "jdbc:mysql://localhost:3306/virtuarts?useSSL=false&serverTimezone=UTC";
    private final String USER = "root";
    private final String PWD = "";

    private MyConnection() {
        try {
            cnx = DriverManager.getConnection(URL, USER, PWD);
            System.out.println("DB Connected ✅");
        } catch (SQLException e) {
            System.out.println("DB Connection failed ❌");
            throw new RuntimeException(e);
        }
    }

    public static MyConnection getInstance() {
        if (instance == null) instance = new MyConnection();
        return instance;
    }

    public Connection getCnx() {
        return cnx;
    }
}