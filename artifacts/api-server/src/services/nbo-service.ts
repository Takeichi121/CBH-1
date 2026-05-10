import sql from "mssql";

function getNBOConfig(): sql.config {
  return {
    user: process.env.NBO_USER || "bk1040",
    password: process.env.NBO_PASSWORD || "",
    server: process.env.NBO_SERVER || "localhost",
    database: process.env.NBO_DATABASE || "AlohaNBO",
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
    requestTimeout: 15000,
  };
}

export async function getNBOSalesAuto() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(getNBOConfig());
    const result = await pool.request().query(`
      SELECT 
        ISNULL(SUM(NetSales), 0) AS TotalSales,
        COUNT(CheckID)           AS GuestCount
      FROM GuestCheck
      WHERE BusinessDate = CAST(GETDATE() AS DATE)
    `);
    return result.recordset[0] as { TotalSales: number; GuestCount: number };
  } catch (err) {
    console.error("🔴 [NBO SQL Error]:", err);
    return null;
  } finally {
    if (pool) await pool.close();
  }
}
