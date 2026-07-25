import java.awt.*;
import java.awt.event.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.List;
import javax.swing.*;
import com.sun.net.httpserver.*;

public class PrintAgent {
    // Default API endpoint setups (points to your Vercel deployment URL)
    private static String BASE_URL = "https://krishna-students-print-hub.vercel.app";
    private static String AUTH_TOKEN = "KP-DEMO-TOKEN-9988";
    private static String DEFAULT_PRINTER = "";
    private static boolean AUTO_START_ENABLED = true;
    private static final int PORT = 4000;
    
    private static boolean autoPrintEnabled = true;
    private static String statusMessage = "Starting...";
    private static TrayIcon trayIcon;
    private static List<Map<String, Object>> remotePrinters = new ArrayList<>();
    private static String lastPingTime = "";
    private static boolean hasLoggedPrinters = false;

    private static CustomPrintStream customOutStream;

    public static void main(String[] args) {
        try {
            String logPath = System.getProperty("user.home") + File.separator + "print-agent.log";
            PrintStream fileOut = new PrintStream(new FileOutputStream(logPath, true), true, "UTF-8");
            customOutStream = new CustomPrintStream(fileOut, null);
            System.setOut(customOutStream);
            System.setErr(customOutStream);
        } catch (Exception e) {}

        System.out.println("\n--- Print Agent Session Started: " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()) + " ---");
        System.out.println("=== Starting Krishna Students Print Hub Agent ===");
        
        // Start PDF printing helper utility download in the background
        new Thread(() -> ensurePrinterUtility()).start();

        // 1. Read existing config properties if saved
        readConfig();

        // 2. If no config file is found, launch the wizard setup panel
        String configPath = System.getProperty("user.home") + File.separator + "config.properties";
        File configFile = new File(configPath);
        if (!configFile.exists()) {
            SwingUtilities.invokeLater(() -> showSetupWizard());
        } else {
            // Config loaded, show live dashboard and run silently in system tray
            SwingUtilities.invokeLater(() -> showStatusDashboard());
            initSystemTray();
            startLocalServer();
            startPollingLoop();
        }
    }

    private static void readConfig() {
        Properties prop = new Properties();
        String configPath = System.getProperty("user.home") + File.separator + "config.properties";
        File configFile = new File(configPath);
        if (configFile.exists()) {
            try (FileInputStream fis = new FileInputStream(configFile)) {
                prop.load(fis);
                BASE_URL = prop.getProperty("site_url", BASE_URL).trim();
                AUTH_TOKEN = prop.getProperty("connection_key", prop.getProperty("auth_token", ""));
                DEFAULT_PRINTER = prop.getProperty("default_printer", "");
                AUTO_START_ENABLED = Boolean.parseBoolean(prop.getProperty("autostart", "true"));
                System.out.println("Using Config URL: " + BASE_URL);
            } catch (IOException e) {
                System.err.println("Could not parse config.properties file: " + e.getMessage());
            }
        }
    }

    private static void saveProperties() {
        Properties prop = new Properties();
        prop.setProperty("site_url", BASE_URL);
        prop.setProperty("connection_key", AUTH_TOKEN);
        prop.setProperty("default_printer", DEFAULT_PRINTER);
        prop.setProperty("autostart", String.valueOf(AUTO_START_ENABLED));
        String configPath = System.getProperty("user.home") + File.separator + "config.properties";
        try (FileOutputStream fos = new FileOutputStream(configPath)) {
            prop.store(fos, "Krishna Print Hub Configuration");
            System.out.println("Saved config properties successfully.");
        } catch (IOException e) {
            System.err.println("Failed to write config.properties file: " + e.getMessage());
        }
    }

    private static void showSetupWizard() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        JFrame frame = new JFrame("Krishna Print Agent Setup");
        frame.setSize(450, 360);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLocationRelativeTo(null);
        frame.setResizable(false);

        JPanel panel = new JPanel();
        panel.setLayout(null);
        panel.setBackground(new Color(248, 250, 252)); // Slate-50 background color
        frame.add(panel);

        JLabel titleLabel = new JLabel("Krishna Print Agent Setup");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        titleLabel.setForeground(new Color(15, 23, 42)); // Slate-900
        titleLabel.setBounds(30, 15, 390, 25);
        panel.add(titleLabel);

        // Environment Selector (Local Server vs Vercel Production)
        JLabel envLabel = new JLabel("Environment Mode:");
        envLabel.setFont(new Font("Segoe UI", Font.BOLD, 11));
        envLabel.setBounds(30, 50, 390, 15);
        panel.add(envLabel);

        JRadioButton localModeRadio = new JRadioButton("Local Mode (http://localhost:3000)", BASE_URL.contains("localhost"));
        localModeRadio.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        localModeRadio.setBackground(new Color(248, 250, 252));
        localModeRadio.setBounds(30, 68, 390, 20);

        JRadioButton prodModeRadio = new JRadioButton("Live Vercel Production App", !BASE_URL.contains("localhost"));
        prodModeRadio.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        prodModeRadio.setBackground(new Color(248, 250, 252));
        prodModeRadio.setBounds(30, 88, 390, 20);

        ButtonGroup envGroup = new ButtonGroup();
        envGroup.add(localModeRadio);
        envGroup.add(prodModeRadio);
        panel.add(localModeRadio);
        panel.add(prodModeRadio);

        // Shop Access Token Field (Connection Key)
        JLabel tokenLabel = new JLabel("Connection Key:");
        tokenLabel.setFont(new Font("Segoe UI", Font.BOLD, 11));
        tokenLabel.setBounds(30, 115, 390, 15);
        panel.add(tokenLabel);

        JPasswordField tokenField = new JPasswordField(AUTH_TOKEN);
        tokenField.setBounds(30, 132, 390, 25);
        panel.add(tokenField);

        // Connected Printer Dropdown Selection
        JLabel printerLabel = new JLabel("Connect Printer:");
        printerLabel.setFont(new Font("Segoe UI", Font.BOLD, 11));
        printerLabel.setBounds(30, 162, 390, 15);
        panel.add(printerLabel);

        Vector<String> printerNames = new Vector<>();
        List<String> rawList = getWindowsPrinters();
        for (String raw : rawList) {
            String name = raw.split("\\|")[0].trim();
            if (!name.isEmpty()) {
                printerNames.add(name);
            }
        }
        if (printerNames.isEmpty()) {
            printerNames.add("Default System Printer");
        }
        
        JComboBox<String> printerDropdown = new JComboBox<>(printerNames);
        printerDropdown.setBounds(30, 180, 390, 25);
        if (!DEFAULT_PRINTER.isEmpty() && printerNames.contains(DEFAULT_PRINTER)) {
            printerDropdown.setSelectedItem(DEFAULT_PRINTER);
        }
        panel.add(printerDropdown);

        // Auto Start Checkbox
        JCheckBox startChk = new JCheckBox("Auto Start with Windows", AUTO_START_ENABLED);
        startChk.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        startChk.setBackground(new Color(248, 250, 252));
        startChk.setBounds(30, 210, 390, 20);
        panel.add(startChk);

        // Connection Test Button
        JButton testBtn = new JButton("Test Server Connection");
        testBtn.setBounds(30, 235, 190, 30);
        testBtn.setFont(new Font("Segoe UI", Font.BOLD, 11));
        testBtn.setUI(new javax.swing.plaf.basic.BasicButtonUI());
        testBtn.setBackground(new java.awt.Color(226, 232, 240)); // Slate-200
        testBtn.setForeground(new java.awt.Color(71, 85, 105)); // Slate-600
        testBtn.setFocusPainted(false);
        panel.add(testBtn);

        testBtn.addActionListener(e -> {
            String url = BASE_URL;
            String token = new String(tokenField.getPassword()).trim();
            if (url.endsWith("/")) {
                url = url.substring(0, url.length() - 1);
            }
            try {
                URL testUrl = new URL(url + "/api/config");
                HttpURLConnection con = (HttpURLConnection) testUrl.openConnection();
                con.setRequestMethod("GET");
                con.setRequestProperty("Authorization", "Bearer " + token);
                con.setConnectTimeout(5000);
                con.setReadTimeout(5000);
                int code = con.getResponseCode();
                if (code == 200) {
                    JOptionPane.showMessageDialog(frame, "✓ Connected successfully to Vercel Server!", "Connection Test", JOptionPane.INFORMATION_MESSAGE);
                } else {
                    JOptionPane.showMessageDialog(frame, "✗ Server returned response code: " + code, "Connection Failed", JOptionPane.ERROR_MESSAGE);
                }
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "✗ Could not reach server: " + ex.getMessage(), "Connection Failed", JOptionPane.ERROR_MESSAGE);
            }
        });

        // Printer Test Button
        JButton testPrintBtn = new JButton("Print Test Page");
        testPrintBtn.setBounds(230, 200, 190, 30);
        testPrintBtn.setFont(new Font("Segoe UI", Font.BOLD, 11));
        testPrintBtn.setUI(new javax.swing.plaf.basic.BasicButtonUI());
        testPrintBtn.setBackground(new java.awt.Color(226, 232, 240));
        testPrintBtn.setForeground(new java.awt.Color(71, 85, 105));
        testPrintBtn.setFocusPainted(false);
        panel.add(testPrintBtn);

        testPrintBtn.addActionListener(e -> {
            String selectedPrn = (String) printerDropdown.getSelectedItem();
            try {
                File tempFile = File.createTempFile("print_agent_test", ".txt");
                try (BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile))) {
                    writer.write("=========================================\n");
                    writer.write("       KRISHNA PRINT AGENT TEST PAGE      \n");
                    writer.write("=========================================\n");
                    writer.write("Printer Name: " + selectedPrn + "\n");
                    writer.write("Status      : Communication OK\n");
                    writer.write("Timestamp   : " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()) + "\n");
                    writer.write("=========================================\n");
                    writer.write("Spool test page dispatched successfully.\n");
                }
                printToWindowsDevice(tempFile, selectedPrn, null);
                JOptionPane.showMessageDialog(frame, "✓ Test page sent to: " + selectedPrn, "Printer Test", JOptionPane.INFORMATION_MESSAGE);
                
                new Thread(() -> {
                    try { Thread.sleep(5000); tempFile.delete(); } catch(Exception ignored) {}
                }).start();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(frame, "✗ Spool failed: " + ex.getMessage(), "Printer Test", JOptionPane.ERROR_MESSAGE);
            }
        });

        // Save & Connect Button
        JButton saveBtn = new JButton("Save & Connect");
        saveBtn.setBounds(30, 260, 390, 35);
        saveBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        saveBtn.setUI(new javax.swing.plaf.basic.BasicButtonUI());
        saveBtn.setBackground(new Color(124, 58, 237)); // Purple Accent
        saveBtn.setForeground(Color.WHITE);
        saveBtn.setFocusPainted(false);
        panel.add(saveBtn);

        saveBtn.addActionListener(e -> {
            String token = new String(tokenField.getPassword()).trim();
            String selectedPrn = (String) printerDropdown.getSelectedItem();
            boolean autostart = startChk.isSelected();

            // Set BASE_URL based on environment radio choice
            if (localModeRadio.isSelected()) {
                BASE_URL = "http://localhost:3000";
            } else {
                BASE_URL = "https://krishna-students-print-hub.vercel.app";
            }

            // Save variables
            AUTH_TOKEN = token;
            DEFAULT_PRINTER = selectedPrn;
            AUTO_START_ENABLED = autostart;
            saveProperties();

            // Configure autostart Run key shortcut in registry
            if (autostart) {
                enableStartupShortcut();
            } else {
                disableStartupShortcut();
            }

            // Run Tray and background spool loop
            frame.dispose();
            SwingUtilities.invokeLater(() -> showStatusDashboard());
            initSystemTray();
            startLocalServer();
            startPollingLoop();
        });

        frame.setVisible(true);
    }

    private static void initSystemTray() {
        if (!SystemTray.isSupported()) {
            System.out.println("System Tray is not supported on this platform.");
            return;
        }

        SystemTray tray = SystemTray.getSystemTray();
        
        Image image = Toolkit.getDefaultToolkit().createImage(new byte[0]);
        try {
            int width = 16, height = 16;
            java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2 = img.createGraphics();
            g2.setColor(new Color(124, 58, 237)); // Purple Brand color
            g2.fillOval(0, 0, width, height);
            g2.dispose();
            image = img;
        } catch (Exception e) {
            e.printStackTrace();
        }

        PopupMenu popup = new PopupMenu();
        MenuItem statusItem = new MenuItem("Status: Active Spools");
        statusItem.setEnabled(false);
        popup.add(statusItem);

        MenuItem settingsItem = new MenuItem("Open Settings / Reconfigure");
        settingsItem.addActionListener(e -> showSetupWizard());
        popup.add(settingsItem);

        MenuItem runAtStartupItem = new MenuItem("Configure Startup Autostart");
        runAtStartupItem.addActionListener(e -> enableStartupShortcut());
        popup.add(runAtStartupItem);

        popup.addSeparator();

        MenuItem exitItem = new MenuItem("Exit Agent");
        exitItem.addActionListener(e -> {
            System.out.println("Exiting Print Agent...");
            System.exit(0);
        });
        popup.add(exitItem);

        trayIcon = new TrayIcon(image, "Krishna Print Agent", popup);
        trayIcon.setImageAutoSize(true);

        try {
            tray.add(trayIcon);
        } catch (AWTException e) {
            System.err.println("TrayIcon could not be added.");
        }
    }

    private static void startLocalServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
            server.createContext("/status", exchange -> {
                // Enable CORS
                exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().add("Content-Type", "application/json");

                String pcName = "Unknown Windows PC";
                try {
                    pcName = InetAddress.getLocalHost().getHostName();
                } catch (Exception ignored) {}

                StringBuilder json = new StringBuilder();
                json.append("{");
                json.append("\"status\": \"online\",");
                json.append("\"pcName\": \"").append(pcName).append("\",");
                json.append("\"autoPrint\": ").append(autoPrintEnabled).append(",");
                json.append("\"lastPing\": \"").append(lastPingTime).append("\",");
                json.append("\"printers\": [");
                
                List<String> localPrinters = getWindowsPrinters();
                for (int i = 0; i < localPrinters.size(); i++) {
                    String raw = localPrinters.get(i);
                    String[] parts = raw.split("\\|");
                    String name = parts[0];
                    String rawStatus = parts.length > 1 ? parts[1] : "3";
                    String rawToner = parts.length > 2 ? parts[2] : "100";

                    String status = "offline";
                    if ("3".equals(rawStatus) || "7".equals(rawStatus)) {
                        status = "idle";
                    } else if ("4".equals(rawStatus)) {
                        status = "printing";
                    }

                    int tonerVal = 100;
                    try {
                        if (rawToner != null && !rawToner.trim().isEmpty() && !"null".equalsIgnoreCase(rawToner)) {
                            tonerVal = Integer.parseInt(rawToner.trim());
                        }
                    } catch (Exception ignored) {}

                    json.append("{");
                    json.append("\"Name\": \"").append(name.replace("\\", "\\\\")).append("\",");
                    json.append("\"PrinterStatus\": \"").append(status).append("\",");
                    json.append("\"Toner\": ").append(tonerVal);
                    json.append("}");
                    if (i < localPrinters.size() - 1) {
                        json.append(",");
                    }
                }
                json.append("]");
                json.append("}");

                byte[] response = json.toString().getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, response.length);
                OutputStream os = exchange.getResponseBody();
                os.write(response);
                os.close();
            });

            server.setExecutor(null);
            server.start();
            System.out.println("Local HTTP status API listening on: http://localhost:" + PORT + "/status");
        } catch (IOException e) {
            System.err.println("Failed to start local status server: " + e.getMessage());
        }
    }

    private static void startPollingLoop() {
        Thread pollThread = new Thread(() -> {
            while (true) {
                try {
                    lastPingTime = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
                    
                    // 1. Send diagnostic ping to cloud config endpoint
                    updateCloudConfig();

                    // 2. Fetch pending paid orders
                    if (autoPrintEnabled) {
                        processPaidOrders();
                    }

                    trayIcon.setToolTip("Krishna Print Agent: Connected\nLast poll: " + lastPingTime);
                    updateDashboardStatus(true, null);
                } catch (Exception e) {
                    System.err.println("Network error in polling loop (Reconnecting in 10 seconds...): " + e.getMessage());
                    statusMessage = "Offline / Reconnecting...";
                    if (trayIcon != null) {
                        trayIcon.setToolTip("Krishna Print Agent: Reconnecting...\n" + e.getMessage());
                    }
                    updateDashboardStatus(false, e.getMessage());
                    
                    // Reconnection recovery delay: Sleep for 10 seconds before next check
                    try {
                        Thread.sleep(10000);
                    } catch (InterruptedException ex) {
                        break;
                    }
                    continue;
                }

                // Sleep for 4 seconds before next check
                try {
                    Thread.sleep(4000);
                } catch (InterruptedException e) {
                    break;
                }
            }
        });
        pollThread.setDaemon(true);
        pollThread.start();
    }

    private static void updateCloudConfig() throws Exception {
        URL url = new URL(BASE_URL + "/api/config");
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json");
        con.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
        con.setConnectTimeout(5000);
        con.setReadTimeout(5000);
        con.setDoOutput(true);

        StringBuilder printersJson = new StringBuilder();
        printersJson.append("[");
        List<String> localPrinters = getWindowsPrinters();
        if (!hasLoggedPrinters) {
            System.out.println("Local Printers Detected by WMI Query:");
            for (String printer : localPrinters) {
                System.out.println("  -> " + printer);
            }
            hasLoggedPrinters = true;
        }
        for (int i = 0; i < localPrinters.size(); i++) {
            String raw = localPrinters.get(i);
            String[] parts = raw.split("\\|");
            String name = parts[0];
            String rawStatus = parts.length > 1 ? parts[1] : "3";
            String rawToner = parts.length > 2 ? parts[2] : "100";
            String workOffline = parts.length > 3 ? parts[3] : "False";

            String status = "idle";
            if ("True".equalsIgnoreCase(workOffline.trim())) {
                status = "offline";
            } else if ("4".equals(rawStatus)) {
                status = "printing";
            }

            int tonerVal = 100;
            try {
                if (rawToner != null && !rawToner.trim().isEmpty() && !"null".equalsIgnoreCase(rawToner)) {
                    tonerVal = Integer.parseInt(rawToner.trim());
                }
            } catch (Exception ignored) {}

            printersJson.append("{");
            printersJson.append("\"Name\":\"").append(name.replace("\\", "\\\\").replace("\"", "\\\"")).append("\",");
            printersJson.append("\"PrinterStatus\":\"").append(status).append("\",");
            printersJson.append("\"Toner\":").append(tonerVal);
            printersJson.append("}");
            if (i < localPrinters.size() - 1) {
                printersJson.append(",");
            }
        }
        printersJson.append("]");

        String pcName = "COUNTER-PC";
        try {
            pcName = InetAddress.getLocalHost().getHostName();
        } catch (Exception ignored) {}

        String osVersion = System.getProperty("os.name") + " " + System.getProperty("os.version");
        String agentVersion = "v1.0.2";

        String jsonPayload = "{"
            + "\"lastAgentPing\":\"" + new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").format(new Date()) + "\","
            + "\"agentVersion\":\"" + agentVersion + "\","
            + "\"pcName\":\"" + pcName + "\","
            + "\"osVersion\":\"" + osVersion + "\","
            + "\"printers\":" + printersJson.toString()
            + "}";

        try (OutputStream os = con.getOutputStream()) {
            byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }

        int code = con.getResponseCode();
        if (code == 200) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line.trim());
                }
                
                String respStr = response.toString();
                if (respStr.contains("\"autoPrintEnabled\":false")) {
                    autoPrintEnabled = false;
                } else if (respStr.contains("\"autoPrintEnabled\":true")) {
                    autoPrintEnabled = true;
                }
            }
        }
    }

    private static void processPaidOrders() throws Exception {
        URL url = new URL(BASE_URL + "/api/orders?agent=true");
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("GET");
        con.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
        con.setConnectTimeout(5000);
        con.setReadTimeout(5000);

        int code = con.getResponseCode();
        if (code == 200) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line.trim());
                }
                
                String respStr = response.toString();
                if (respStr.contains("\"orders\":[")) {
                    List<Map<String, String>> orders = parseOrders(respStr);
                    for (Map<String, String> order : orders) {
                        String status = order.get("status");
                        if ("paid".equals(status) || "queued".equals(status)) {
                            spoolJob(order);
                        }
                    }
                }
            }
        }
    }

    private static void spoolJob(Map<String, String> order) {
        String orderId = order.get("id");
        String name = order.get("customerName");
        String file = order.get("fileName");
        String copies = order.get("copies");
        String pages = order.get("pages");
        String paperSize = order.get("paperSize");
        String colorMode = order.get("colorMode");
        String duplex = order.get("duplex");
        String assignedPrinterId = order.get("assignedPrinterId");
        String fileUrl = order.get("fileUrl");

        System.out.println("Processing Print Job #" + orderId + " (" + file + ")");
        System.out.println("DEBUG: fileUrl parsed as: '" + fileUrl + "'");
        
        String targetPrinter = determineTargetPrinter(paperSize, colorMode, assignedPrinterId);
        System.out.println("Routing Job #" + orderId + " to targeted printer: " + targetPrinter);

        try {
            // Check if we have a real file URL uploaded to the database
            if (fileUrl != null && !fileUrl.trim().isEmpty()) {
                updateOrderStatus(orderId, "downloading");
                System.out.println("Downloading document file from: " + fileUrl);
                
                String ext = ".pdf";
                if (file.contains(".")) {
                    ext = file.substring(file.lastIndexOf("."));
                }
                
                File downloadedFile = File.createTempFile("spool_doc_" + orderId + "_", ext);
                downloadFile(fileUrl, downloadedFile);
                
                updateOrderStatus(orderId, "printing");
                System.out.println("Sending actual document (" + file + ") to Windows Print Spooler...");
                
                printToWindowsDevice(downloadedFile, targetPrinter, order);
                
                Thread.sleep(15000);
                updateOrderStatus(orderId, "completed");
                System.out.println("Job #" + orderId + " completed printing successfully.");
                
                new Thread(() -> {
                    try { Thread.sleep(30000); downloadedFile.delete(); } catch (InterruptedException ignored) {}
                }).start();
            } else {
                // Fallback to receipt ticket printing if no fileUrl is provided (e.g. legacy/mock data)
                updateOrderStatus(orderId, "printing");
                File tempTicket = File.createTempFile("spool_ticket_" + orderId, ".txt");
                try (BufferedWriter writer = new BufferedWriter(new FileWriter(tempTicket))) {
                    writer.write("=========================================\n");
                    writer.write("         KRISHNA STUDENTS PRINT HUB      \n");
                    writer.write("=========================================\n");
                    writer.write("ORDER ID: " + orderId + "\n");
                    writer.write("CUSTOMER: " + name + "\n");
                    writer.write("DOCUMENT: " + file + "\n");
                    writer.write("PAGES   : " + pages + " page(s)\n");
                    writer.write("COPIES  : " + copies + " copy(ies)\n");
                    writer.write("CONFIG  : " + paperSize + " · " + colorMode.toUpperCase() + " · " + duplex.toUpperCase() + "\n");
                    writer.write("=========================================\n");
                    writer.write("Please collect your prints at the counter.\n");
                    writer.write("Thank you for printing with us!\n");
                    writer.write("=========================================\n");
                }

                printToWindowsDevice(tempTicket, targetPrinter, order);

                Thread.sleep(15000);
                updateOrderStatus(orderId, "completed");
                System.out.println("Job #" + orderId + " completed printing (fallback ticket) successfully.");
                
                new Thread(() -> {
                    try { Thread.sleep(20000); tempTicket.delete(); } catch (InterruptedException ignored) {}
                }).start();
            }
        } catch (Exception e) {
            System.err.println("Printing error on job #" + orderId + ": " + e.getMessage());
            updateOrderStatus(orderId, "error");
        }
    }

    private static void downloadFile(String fileUrl, File destination) throws Exception {
        String fullUrl = fileUrl.startsWith("http") ? fileUrl : BASE_URL + fileUrl;
        
        // Auto-fix tmpfiles.org URLs to direct download subpath (/dl/)
        if (fullUrl.contains("tmpfiles.org/") && !fullUrl.contains("tmpfiles.org/dl/")) {
            fullUrl = fullUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
        }

        HttpURLConnection con = null;
        int status = -1;
        String targetUrl = fullUrl;
        
        // Loop up to 5 times for HTTP redirects (e.g. S3 / tmpfiles.org buckets)
        for (int i = 0; i < 5; i++) {
            if (targetUrl.contains("tmpfiles.org/") && !targetUrl.contains("tmpfiles.org/dl/")) {
                targetUrl = targetUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
            }
            
            // Encode spaces and special characters for java.net.URL safety
            String encodedUrl = targetUrl.replace(" ", "%20").replace("(", "%28").replace(")", "%29");
            URL url = new URL(encodedUrl);
            con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");
            con.setConnectTimeout(10000);
            con.setReadTimeout(15000);
            con.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            
            // Only add connection authentication header if it's pointing to our own backend
            if (!targetUrl.startsWith("http") || targetUrl.startsWith(BASE_URL)) {
                con.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
            }
            
            status = con.getResponseCode();
            if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM || status == 307 || status == 308) {
                targetUrl = con.getHeaderField("Location");
                con.disconnect();
            } else {
                break;
            }
        }

        if (status == 401 && targetUrl.contains("cloudinary.com/") && targetUrl.contains("/raw/upload/")) {
            System.out.println("Cloudinary raw URL returned 401. Retrying via image resource endpoint...");
            targetUrl = targetUrl.replace("/raw/upload/", "/image/upload/");
            URL retryUrl = new URL(targetUrl.replace(" ", "%20").replace("(", "%28").replace(")", "%29"));
            con = (HttpURLConnection) retryUrl.openConnection();
            con.setRequestMethod("GET");
            con.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36");
            status = con.getResponseCode();
        }

        if (status != 200) {
            throw new IOException("Failed to download PDF document file (HTTP " + status + ") from: " + targetUrl);
        }

        try (InputStream in = con.getInputStream();
             FileOutputStream out = new FileOutputStream(destination)) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }

        // Validate downloaded file content to prevent printing HTML error pages on paper
        if (destination.exists() && destination.length() > 0) {
            byte[] header = new byte[Math.min(500, (int) destination.length())];
            try (FileInputStream fis = new FileInputStream(destination)) {
                int readBytes = fis.read(header);
                String headStr = new String(header, 0, readBytes, StandardCharsets.UTF_8).toLowerCase();
                
                if (headStr.contains("<!doctype html") || headStr.contains("<html") || headStr.contains("404 not found")) {
                    destination.delete();
                    throw new IOException("The file URL returned an HTML web page (e.g. 404 error or landing page) instead of the actual document file: " + fullUrl);
                }
                
                if (destination.getName().toLowerCase().endsWith(".pdf") && !headStr.startsWith("%pdf")) {
                    System.err.println("[WARNING] Downloaded PDF header does not start with '%PDF'. Header preview: " + headStr.substring(0, Math.min(30, headStr.length())));
                }
            }
        }
    }

    private static String determineTargetPrinter(String paperSize, String colorMode, String assignedPrinterId) {
        if (assignedPrinterId != null && !assignedPrinterId.trim().isEmpty()) {
            try {
                URL url = new URL(BASE_URL + "/api/config");
                HttpURLConnection con = (HttpURLConnection) url.openConnection();
                con.setRequestMethod("GET");
                con.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
                con.setConnectTimeout(5000);
                con.setReadTimeout(5000);
                if (con.getResponseCode() == 200) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
                        StringBuilder response = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) {
                            response.append(line.trim());
                        }
                        String configStr = response.toString();
                        if (configStr.contains("\"printers\":[")) {
                            List<Map<String, Object>> printers = parsePrintersConfig(configStr);
                            for (Map<String, Object> p : printers) {
                                if (assignedPrinterId.equals(p.get("id"))) {
                                    return (String) p.get("name");
                                }
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        try {
            URL url = new URL(BASE_URL + "/api/config");
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");
            con.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
            con.setConnectTimeout(5000);
            con.setReadTimeout(5000);
            if (con.getResponseCode() == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line.trim());
                    }
                    String configStr = response.toString();
                    
                    if (configStr.contains("\"printers\":[")) {
                        List<Map<String, Object>> printers = parsePrintersConfig(configStr);
                        if (!printers.isEmpty()) {
                            for (Map<String, Object> p : printers) {
                                boolean matchesA3 = "A3".equalsIgnoreCase(paperSize) && Boolean.TRUE.equals(p.get("supportsA3"));
                                boolean matchesColor = "color".equalsIgnoreCase(colorMode) && Boolean.TRUE.equals(p.get("supportsColor"));
                                
                                if (matchesA3 || matchesColor) {
                                    return (String) p.get("name");
                                }
                            }
                            
                            for (Map<String, Object> p : printers) {
                                if (Boolean.TRUE.equals(p.get("isDefault"))) {
                                    return (String) p.get("name");
                                }
                            }
                            return (String) printers.get(0).get("name");
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        List<String> locals = getWindowsPrinters();
        if (!locals.isEmpty()) {
            for (String raw : locals) {
                String pName = raw.split("\\|")[0];
                String pLower = pName.toLowerCase();
                if (!pLower.contains("microsoft print to pdf") && !pLower.contains("fax") && !pLower.contains("xps") && !pLower.contains("onenote")) {
                    return pName;
                }
            }
            return locals.get(0).split("\\|")[0];
        }
        return "HP LaserJet Pro";
    }

    private static File getPrinterUtilityFile() {
        // 1. Check same folder as JAR file
        try {
            String jarPath = PrintAgent.class.getProtectionDomain().getCodeSource().getLocation().getPath();
            String decodedPath = java.net.URLDecoder.decode(jarPath, "UTF-8");
            File jarDir = new File(decodedPath).getParentFile();
            File util = new File(jarDir, "SumatraPDF.exe");
            if (util.exists() && util.length() > 2000000) {
                return util;
            }
        } catch (Exception ignored) {}

        // 2. Check current working directory
        File utilCurrent = new File("SumatraPDF.exe");
        if (utilCurrent.exists() && utilCurrent.length() > 2000000) {
            return utilCurrent;
        }

        // 3. Check user home folder
        String homeDir = System.getProperty("user.home");
        return new File(homeDir + File.separator + "SumatraPDF.exe");
    }

    private static void printToWindowsDevice(File ticketFile, String printerName, Map<String, String> orderParams) throws Exception {
        ensurePrinterUtility();

        File helperExe = getPrinterUtilityFile();
        
        String fileNameLower = ticketFile.getName().toLowerCase();
        boolean isPrintableWithSumatra = fileNameLower.endsWith(".pdf") || 
                                         fileNameLower.endsWith(".png") || 
                                         fileNameLower.endsWith(".jpg") || 
                                         fileNameLower.endsWith(".jpeg") || 
                                         fileNameLower.endsWith(".gif") || 
                                         fileNameLower.endsWith(".webp") || 
                                         fileNameLower.endsWith(".bmp");

        if (isPrintableWithSumatra && helperExe.exists()) {
            System.out.println("Using SumatraPDF utility for printing document/image silently...");
            List<String> cmd = new ArrayList<>();
            cmd.add(helperExe.getAbsolutePath());
            if (printerName != null && !printerName.trim().isEmpty()) {
                cmd.add("-print-to");
                cmd.add(printerName.trim());
            } else {
                cmd.add("-print-to-default");
            }

            // Build SumatraPDF print settings to explicitly override printer driver defaults
            List<String> settingsList = new ArrayList<>();
            if (orderParams != null) {
                // 1. Copies: ALWAYS pass "1x", "2x", "3x" so printer driver defaults (e.g. 2 copies) are overridden
                String copies = orderParams.get("copies");
                int numCopies = 1;
                if (copies != null && !copies.trim().isEmpty()) {
                    try {
                        numCopies = Math.max(1, Integer.parseInt(copies.trim()));
                    } catch (Exception ignored) {}
                }
                settingsList.add(numCopies + "x");

                // 2. Duplex (Double-sided printing): ALWAYS pass duplexlong or simplex
                String duplex = orderParams.get("duplex");
                String dLower = duplex != null ? duplex.trim().toLowerCase() : "";
                if (dLower.contains("duplex") || dLower.contains("double") || dLower.equals("long") || dLower.equals("duplexlong")) {
                    settingsList.add("duplexlong");
                } else if (dLower.contains("short") || dLower.equals("duplexshort")) {
                    settingsList.add("duplexshort");
                } else {
                    settingsList.add("simplex");
                }

                // 3. Color Mode: ALWAYS pass monochrome or color
                String colorMode = orderParams.get("colorMode");
                String cLower = colorMode != null ? colorMode.trim().toLowerCase() : "";
                if (cLower.contains("color")) {
                    settingsList.add("color");
                } else {
                    settingsList.add("monochrome");
                }

                // 4. Paper Size (A4, A3, Letter, Legal)
                String paperSize = orderParams.get("paperSize");
                if (paperSize != null && !paperSize.trim().isEmpty()) {
                    String pSize = paperSize.trim().toUpperCase();
                    if ("A4".equals(pSize) || "A3".equals(pSize) || "LETTER".equals(pSize) || "LEGAL".equals(pSize) || "A5".equals(pSize)) {
                        settingsList.add("paper=" + pSize);
                    }
                } else {
                    settingsList.add("paper=A4");
                }

                // 5. Orientation (portrait / landscape)
                String orientation = orderParams.get("orientation");
                String oLower = orientation != null ? orientation.trim().toLowerCase() : "";
                if (oLower.contains("landscape")) {
                    settingsList.add("landscape");
                } else {
                    settingsList.add("portrait");
                }
            }

            if (!settingsList.isEmpty()) {
                String printSettingsStr = String.join(",", settingsList);
                System.out.println("Applying SumatraPDF print settings: " + printSettingsStr);
                cmd.add("-print-settings");
                cmd.add(printSettingsStr);
            }

            cmd.add(ticketFile.getAbsolutePath());
            
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("SumatraPDF: " + line);
                    output.append(line).append("\n");
                }
            }
            int exitCode = p.waitFor();
            if (exitCode != 0) {
                System.err.println("SumatraPDF returned exit code " + exitCode + ". Output: " + output.toString() + ". Executing Windows Print Verb fallback...");
                executeWindowsVerbPrint(ticketFile, printerName);
            }
        } else {
            executeWindowsVerbPrint(ticketFile, printerName);
        }
    }

    private static void executeWindowsVerbPrint(File ticketFile, String printerName) {
        try {
            System.out.println("Using default Windows Verb Print for file spooling...");
            String spoolCmd = "Start-Process -FilePath \"" + ticketFile.getAbsolutePath() + "\" -Verb Print";
            String fullCmd;
            if (printerName != null && !printerName.trim().isEmpty() && !printerName.equalsIgnoreCase("HP LaserJet Pro")) {
                String setPrinterCmd = "Set-DefaultPrinter -Name \"" + printerName + "\"";
                fullCmd = setPrinterCmd + "; Start-Sleep -s 1; " + spoolCmd;
            } else {
                fullCmd = spoolCmd;
            }
            
            ProcessBuilder pb = new ProcessBuilder("powershell", "-Command", fullCmd);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("PowerShell: " + line);
                }
            }
            p.waitFor();
        } catch (Exception e) {
            System.err.println("Windows Verb Print fallback failed: " + e.getMessage());
        }
    }

    private static void ensurePrinterUtility() {
        File util = getPrinterUtilityFile();
        if (util.exists() && util.length() > 2000000) {
            return;
        }
        
        System.out.println("Extracting SumatraPDF printing utility from JAR resources...");
        try (InputStream in = PrintAgent.class.getResourceAsStream("/SumatraPDF.exe");
             FileOutputStream out = new FileOutputStream(util)) {
            
            if (in == null) {
                throw new Exception("SumatraPDF.exe resource not found in JAR");
            }
            
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            System.out.println("SumatraPDF extracted successfully to: " + util.getAbsolutePath());
        } catch (Exception e) {
            System.err.println("Failed to extract SumatraPDF resource: " + e.getMessage());
            
            // Fallback: Try downloading from raw GitHub URL
            System.out.println("Downloading SumatraPDF printing helper utility as fallback...");
            String targetUrl = "https://raw.githubusercontent.com/naveenkumar-arch/krishna-print-hub/main/SumatraPDF.exe";
            HttpURLConnection conn = null;
            int status = -1;
            try {
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(20000);
                status = conn.getResponseCode();
                if (status == 200) {
                    try (InputStream downloadIn = conn.getInputStream();
                         FileOutputStream downloadOut = new FileOutputStream(util)) {
                        byte[] downloadBuffer = new byte[4096];
                        int downloadBytesRead;
                        while ((downloadBytesRead = downloadIn.read(downloadBuffer)) != -1) {
                            downloadOut.write(downloadBuffer, 0, downloadBytesRead);
                        }
                    }
                    System.out.println("SumatraPDF downloaded successfully to: " + util.getAbsolutePath());
                } else {
                    System.err.println("Failed to download fallback SumatraPDF. Status: " + status);
                }
            } catch (Exception err) {
                System.err.println("Failed to download fallback SumatraPDF: " + err.getMessage());
            }
        }
    }

    private static void updateOrderStatus(String id, String status) {
        try {
            URL url = new URL(BASE_URL + "/api/orders");
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("PUT");
            con.setRequestProperty("Content-Type", "application/json");
            con.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
            con.setConnectTimeout(5000);
            con.setReadTimeout(5000);
            con.setDoOutput(true);

            String jsonPayload = "{\"id\":\"" + id + "\",\"status\":\"" + status + "\"}";
            try (OutputStream os = con.getOutputStream()) {
                byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int code = con.getResponseCode();
            System.out.println("Order #" + id + " status set to: " + status + " (Response: " + code + ")");
        } catch (Exception e) {
            System.err.println("Failed to update status for order #" + id + ": " + e.getMessage());
        }
    }

    private static List<String> getWindowsPrinters() {
        List<String> list = new ArrayList<>();
        try {
            String command = "Get-CimInstance -ClassName Win32_Printer | ForEach-Object { $_.Name + '|' + $_.PrinterStatus + '|' + $_.EstimatedChargeRemaining + '|' + $_.WorkOffline }";
            ProcessBuilder pb = new ProcessBuilder("powershell", "-Command", command);
            Process p = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.trim().isEmpty()) {
                        list.add(line.trim());
                    }
                }
            }
            p.waitFor();
        } catch (Exception e) {
            System.err.println("Failed to fetch Windows printers via PowerShell: " + e.getMessage());
        }

        // Fallback: Use standard Java Print API (Win32 Spooler) if PowerShell is restricted/blocked
        if (list.isEmpty()) {
            try {
                javax.print.PrintService[] services = javax.print.PrintServiceLookup.lookupPrintServices(null, null);
                for (javax.print.PrintService service : services) {
                    list.add(service.getName() + "|3|100|False");
                }
            } catch (Exception err) {
                System.err.println("Failed to lookup Java PrintServices fallback: " + err.getMessage());
            }
        }
        return list;
    }

    private static void enableStartupShortcut() {
        try {
            String jarPath = new File(PrintAgent.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getPath();
            if (jarPath.endsWith(".class") || jarPath.endsWith("bin")) {
                jarPath = new File("PrintAgent.java").getAbsolutePath();
            }

            String command = "reg add \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\" /v \"KrishnaPrintAgent\" /t REG_SZ /d \"java -jar \\\"" + jarPath + "\\\"\" /f";
            if (jarPath.endsWith(".java")) {
                command = "reg add \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\" /v \"KrishnaPrintAgent\" /t REG_SZ /d \"java \\\"" + jarPath + "\\\"\" /f";
            }

            ProcessBuilder pb = new ProcessBuilder("cmd.exe", "/c", command);
            Process p = pb.start();
            p.waitFor();
            toastIcon("Startup Enabled", "Krishna Print Agent will now automatically start when Windows boots up.");
        } catch (Exception e) {
            toastIcon("Startup Error", "Could not configure autostart settings: " + e.getMessage());
        }
    }

    private static void disableStartupShortcut() {
        try {
            String command = "reg delete \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\" /v \"KrishnaPrintAgent\" /f";
            ProcessBuilder pb = new ProcessBuilder("cmd.exe", "/c", command);
            Process p = pb.start();
            p.waitFor();
            toastIcon("Startup Disabled", "Krishna Print Agent autostart on boot was removed.");
        } catch (Exception e) {
            toastIcon("Startup Error", "Could not remove autostart settings: " + e.getMessage());
        }
    }

    private static void toastIcon(String title, String message) {
        if (trayIcon != null) {
            trayIcon.displayMessage(title, message, TrayIcon.MessageType.INFO);
        }
    }

    private static List<Map<String, String>> parseOrders(String json) {
        List<Map<String, String>> list = new ArrayList<>();
        try {
            int index = json.indexOf("\"orders\":[");
            if (index == -1) return list;
            String listContent = json.substring(index + 9);
            
            String[] blocks = listContent.split("\\{");
            for (String block : blocks) {
                if (!block.contains("}")) continue;
                Map<String, String> map = new HashMap<>();
                map.put("id", extractJsonVal(block, "id"));
                map.put("status", extractJsonVal(block, "status"));
                map.put("customerName", extractJsonVal(block, "customerName"));
                map.put("fileName", extractJsonVal(block, "fileName"));
                map.put("copies", extractJsonVal(block, "copies"));
                map.put("pages", extractJsonVal(block, "pages"));
                map.put("paperSize", extractJsonVal(block, "paperSize"));
                map.put("colorMode", extractJsonVal(block, "colorMode"));
                map.put("duplex", extractJsonVal(block, "duplex"));
                map.put("assignedPrinterId", extractJsonVal(block, "assignedPrinterId"));
                map.put("fileUrl", extractJsonVal(block, "fileUrl"));
                System.out.println("Parsed Order from JSON - ID: " + map.get("id") + ", status: " + map.get("status") + ", fileUrl: '" + map.get("fileUrl") + "'");
                list.add(map);
            }
        } catch (Exception ignored) {}
        return list;
    }

    private static List<Map<String, Object>> parsePrintersConfig(String json) {
        List<Map<String, Object>> list = new ArrayList<>();
        try {
            int index = json.indexOf("\"printers\":");
            if (index == -1) return list;
            int startBracket = json.indexOf("[", index);
            if (startBracket == -1) return list;
            int endBracket = json.indexOf("]", startBracket);
            if (endBracket == -1) return list;
            
            String arrayContent = json.substring(startBracket + 1, endBracket);
            String[] blocks = arrayContent.split("\\{");
            for (String block : blocks) {
                if (!block.contains("}")) continue;
                Map<String, Object> map = new HashMap<>();
                map.put("id", extractJsonVal(block, "id"));
                map.put("name", extractJsonVal(block, "name"));
                map.put("isDefault", block.contains("\"isDefault\":true"));
                map.put("supportsColor", block.contains("\"supportsColor\":true"));
                map.put("supportsA3", block.contains("\"supportsA3\":true"));
                map.put("isHighSpeed", block.contains("\"isHighSpeed\":true"));
                list.add(map);
            }
        } catch (Exception ignored) {}
        return list;
    }

    private static String extractJsonVal(String block, String key) {
        int idx = block.indexOf("\"" + key + "\"");
        if (idx == -1) return "";
        int start = block.indexOf(":", idx);
        if (start == -1) return "";
        start++;
        
        char term = ',';
        int quoteIdx = block.indexOf("\"", start);
        if (quoteIdx != -1 && quoteIdx < block.indexOf(term, start)) {
            int endQuote = block.indexOf("\"", quoteIdx + 1);
            return block.substring(quoteIdx + 1, endQuote);
        } else {
            int end = block.indexOf(",", start);
            if (end == -1) end = block.indexOf("}", start);
            if (end == -1) return "";
            return block.substring(start, end).trim().replace("\"", "");
        }
    }

    private static JFrame dashboardFrame;
    private static JLabel statusValLabel;
    private static JLabel printerValLabel;
    private static JTextArea logTextArea;
    private static JTable printerTable;
    private static javax.swing.table.DefaultTableModel printerTableModel;

    private static class CustomPrintStream extends PrintStream {
        private final JTextArea textArea;
        private JTextArea activeTextArea;

        public CustomPrintStream(PrintStream fileStream, JTextArea textArea) {
            super(fileStream, true);
            this.textArea = textArea;
            this.activeTextArea = textArea;
        }

        public void setTextArea(JTextArea newTextArea) {
            this.activeTextArea = newTextArea;
        }

        @Override
        public void write(byte[] buf, int off, int len) {
            super.write(buf, off, len);
            String message = new String(buf, off, len);
            JTextArea target = this.activeTextArea;
            if (target != null) {
                SwingUtilities.invokeLater(() -> {
                    target.append(message);
                    if (target.getLineCount() > 300) {
                        try {
                            int end = target.getLineStartOffset(20);
                            target.replaceRange("", 0, end);
                        } catch (Exception ignored) {}
                    }
                    target.setCaretPosition(target.getDocument().getLength());
                });
            }
        }
    }

    private static void showStatusDashboard() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        if (dashboardFrame != null) {
            dashboardFrame.setVisible(true);
            dashboardFrame.toFront();
            return;
        }

        dashboardFrame = new JFrame("Krishna Print Agent Dashboard");
        dashboardFrame.setSize(750, 480);
        dashboardFrame.setDefaultCloseOperation(JFrame.HIDE_ON_CLOSE);
        dashboardFrame.setLocationRelativeTo(null);
        dashboardFrame.setResizable(false);

        JPanel panel = new JPanel();
        panel.setLayout(null);
        panel.setBackground(new Color(248, 250, 252));
        dashboardFrame.add(panel);

        JLabel titleLabel = new JLabel("Krishna Print Agent - Live Dashboard");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        titleLabel.setForeground(new Color(124, 58, 237));
        titleLabel.setBounds(20, 15, 340, 25);
        panel.add(titleLabel);

        // Status
        JLabel statusLabel = new JLabel("Connection Status:");
        statusLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        statusLabel.setBounds(20, 55, 120, 20);
        panel.add(statusLabel);

        statusValLabel = new JLabel("CONNECTING...");
        statusValLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        statusValLabel.setForeground(Color.ORANGE);
        statusValLabel.setBounds(150, 55, 210, 20);
        panel.add(statusValLabel);

        // Default Printer
        JLabel printerLabel = new JLabel("Assigned Printer:");
        printerLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        printerLabel.setBounds(20, 85, 120, 20);
        panel.add(printerLabel);

        printerValLabel = new JLabel(DEFAULT_PRINTER.isEmpty() ? "None Selected" : DEFAULT_PRINTER);
        printerValLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        printerValLabel.setBounds(150, 85, 210, 20);
        panel.add(printerValLabel);

        // Logs panel
        JLabel logLabel = new JLabel("Live Operations Log:");
        logLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        logLabel.setBounds(20, 120, 340, 20);
        panel.add(logLabel);

        logTextArea = new JTextArea();
        logTextArea.setEditable(false);
        logTextArea.setFont(new Font("Consolas", Font.PLAIN, 11));
        logTextArea.setBackground(new Color(15, 23, 42));
        logTextArea.setForeground(new Color(244, 244, 245));
        
        JScrollPane scrollPane = new JScrollPane(logTextArea);
        scrollPane.setBounds(20, 145, 340, 200);
        panel.add(scrollPane);

        // Reconfigure Button
        JButton configBtn = new JButton("Open Settings");
        configBtn.setBounds(20, 360, 150, 30);
        configBtn.setFont(new Font("Segoe UI", Font.BOLD, 11));
        panel.add(configBtn);
        configBtn.addActionListener(e -> showSetupWizard());

        // Exit Button
        JButton exitBtn = new JButton("Shutdown Agent");
        exitBtn.setBounds(210, 360, 150, 30);
        exitBtn.setFont(new Font("Segoe UI", Font.BOLD, 11));
        panel.add(exitBtn);
        exitBtn.addActionListener(e -> System.exit(0));

        // Minimize to Tray info label
        JLabel infoLabel = new JLabel("Note: Closing this window keeps the agent running in your tray.");
        infoLabel.setFont(new Font("Segoe UI", Font.ITALIC, 10));
        infoLabel.setForeground(Color.GRAY);
        infoLabel.setBounds(20, 405, 340, 15);
        panel.add(infoLabel);

        // --- Right Column: Local Printers ---
        JLabel printersTitleLabel = new JLabel("Detected Local Printers");
        printersTitleLabel.setFont(new Font("Segoe UI", Font.BOLD, 14));
        printersTitleLabel.setForeground(new Color(15, 23, 42));
        printersTitleLabel.setBounds(390, 15, 330, 25);
        panel.add(printersTitleLabel);

        // Create table model
        String[] columns = {"Printer Name", "Status", "Toner"};
        printerTableModel = new javax.swing.table.DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        printerTable = new JTable(printerTableModel);
        printerTable.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        printerTable.setRowHeight(20);
        
        JScrollPane tableScrollPane = new JScrollPane(printerTable);
        tableScrollPane.setBounds(390, 55, 330, 290);
        panel.add(tableScrollPane);

        JButton refreshPrintersBtn = new JButton("Refresh Printers List");
        refreshPrintersBtn.setBounds(390, 360, 330, 30);
        refreshPrintersBtn.setFont(new Font("Segoe UI", Font.BOLD, 11));
        panel.add(refreshPrintersBtn);
        refreshPrintersBtn.addActionListener(e -> populatePrinterTable());

        // Populate table initially
        populatePrinterTable();

        if (customOutStream != null) {
            customOutStream.setTextArea(logTextArea);
        }

        dashboardFrame.setVisible(true);
    }

    private static void populatePrinterTable() {
        if (printerTableModel == null) return;
        new Thread(() -> {
            List<String> list = getWindowsPrinters();
            SwingUtilities.invokeLater(() -> {
                printerTableModel.setRowCount(0);
                for (String raw : list) {
                    String[] parts = raw.split("\\|");
                    String name = parts[0];
                    String rawStatus = parts.length > 1 ? parts[1] : "3";
                    String rawToner = parts.length > 2 ? parts[2] : "100";
                    String workOffline = parts.length > 3 ? parts[3] : "False";

                    String status = "Idle";
                    if ("True".equalsIgnoreCase(workOffline.trim())) {
                        status = "Offline";
                    } else if ("4".equals(rawStatus)) {
                        status = "Printing";
                    }
                    
                    String toner = rawToner.trim().isEmpty() || "null".equalsIgnoreCase(rawToner.trim()) ? "N/A" : rawToner + "%";
                    printerTableModel.addRow(new Object[]{name, status, toner});
                }
            });
        }).start();
    }

    private static void updateDashboardStatus(boolean online, String error) {
        SwingUtilities.invokeLater(() -> {
            if (statusValLabel != null) {
                if (online) {
                    statusValLabel.setText("🟢 ONLINE / IDLE");
                    statusValLabel.setForeground(new Color(22, 163, 74));
                } else {
                    statusValLabel.setText("🔴 OFFLINE: " + (error != null ? error : "Reconnecting..."));
                    statusValLabel.setForeground(Color.RED);
                }
            }
            if (printerValLabel != null) {
                printerValLabel.setText(DEFAULT_PRINTER.isEmpty() ? "None Selected" : DEFAULT_PRINTER);
            }
        });
    }
}
