import { DBFFile } from "dbffile";
import path from "path";

export async function getAlohaSalesRaw() {
  try {
    const dbfPath = process.env.ALOHA_DBF_PATH || path.resolve("C:/Aloha/DATA/GNDSALE.dbf");
    const dbf = await DBFFile.open(dbfPath);
    const records = await dbf.readRecords(100);

    const totalFromDbf = records.reduce(
      (sum, rec: any) => sum + (Number(rec.AMOUNT) || 0),
      0
    );

    return {
      totalFromDbf,
      lastRecordCount: records.length,
      recentItems: records.slice(0, 5),
    };
  } catch (error) {
    console.error("🔴 [Aloha DBF Error]:", error);
    return null;
  }
}
