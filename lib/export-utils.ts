import type { Inspection } from "@/types/inspection"

/**
 * Format date string into Indonesian locale format
 */
function formatDate(dateStr?: string) {
    if (!dateStr) return "-"
    try {
        return new Date(dateStr).toLocaleString("id-ID", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        })
    } catch {
        return dateStr
    }
}

/**
 * Translate status code to human readable text
 */
function translateStatus(status: string) {
    switch (status) {
        case "approved":
            return "Disetujui"
        case "pending":
            return "Menunggu Tinjauan"
        case "needs_correction":
            return "Perlu Perbaikan"
        default:
            return status
    }
}

/**
 * Clean string for CSV cell (escapes double quotes)
 */
function escapeCSVCell(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
}

/**
 * Export inspection logs array to CSV file
 */
export function exportToCSV(inspections: Inspection[], filename = "Laporan_Inspeksi_Kontainer.csv") {
    const headers = [
        "ID",
        "No. Kontainer",
        "Nama Shipper",
        "Komoditi",
        "Lokasi Pemeriksaan",
        "Status",
        "Petugas Inspeksi",
        "Tanggal Dibuat",
        "Koordinat / Alamat",
        "Catatan Petugas",
        "Catatan Admin",
    ]

    const rows = inspections.map((item) => {
        const locationStr = item.location
            ? `${item.location.address?.street || item.location.address?.name || ""}, ${item.location.address?.city || ""}`.trim() ||
              `${item.location.latitude || ""}, ${item.location.longitude || ""}`
            : "-"

        const siteStr = item.inspectionLocationName
            ? `${item.inspectionLocationType === "depo" ? "Depo" : "Pabrik"}: ${item.inspectionLocationName}`
            : "-"

        return [
            escapeCSVCell(item.id),
            escapeCSVCell(item.containerNumber || "-"),
            escapeCSVCell(item.shipperName),
            escapeCSVCell(item.commodityType),
            escapeCSVCell(siteStr),
            escapeCSVCell(translateStatus(item.status)),
            escapeCSVCell(item.createdBy),
            escapeCSVCell(formatDate(item.createdAt)),
            escapeCSVCell(locationStr),
            escapeCSVCell(item.notes || "-"),
            escapeCSVCell(item.adminNotes || "-"),
        ].join(",")
    })

    // UTF-8 BOM byte prefix for Excel compatibility
    const csvContent = "\uFEFF" + [headers.map(escapeCSVCell).join(","), ...rows].join("\r\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Clean text string for XML XML-escaping
 */
function escapeXML(str: string | number | null | undefined): string {
    if (str === null || str === undefined) return ""
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

/**
 * Export inspection logs to Excel XML (.xls / .xlsx format)
 */
export function exportToExcel(inspections: Inspection[], filename = "Laporan_Inspeksi_Kontainer.xls") {
    const headers = [
        "ID",
        "No. Kontainer",
        "Nama Shipper",
        "Komoditi",
        "Lokasi Pemeriksaan",
        "Status",
        "Petugas Inspeksi",
        "Tanggal Dibuat",
        "Koordinat / Alamat",
        "Catatan Petugas",
        "Catatan Admin",
    ]

    let xmlRows = `
    <Row ss:Height="24">
      ${headers
          .map(
              (h) => `
        <Cell ss:StyleID="HeaderStyle">
          <Data ss:Type="String">${escapeXML(h)}</Data>
        </Cell>`
          )
          .join("")}
    </Row>`

    inspections.forEach((item, index) => {
        const locationStr = item.location
            ? `${item.location.address?.street || item.location.address?.name || ""}, ${item.location.address?.city || ""}`.trim() ||
              `${item.location.latitude || ""}, ${item.location.longitude || ""}`
            : "-"

        const siteStr = item.inspectionLocationName
            ? `${item.inspectionLocationType === "depo" ? "Depo" : "Pabrik"}: ${item.inspectionLocationName}`
            : "-"

        const styleId = index % 2 === 0 ? "EvenRowStyle" : "OddRowStyle"

        xmlRows += `
    <Row ss:Height="20">
      <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${item.id}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.containerNumber || "-")}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.shipperName)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.commodityType)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(siteStr)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(translateStatus(item.status))}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.createdBy)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(formatDate(item.createdAt))}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(locationStr)}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.notes || "-")}</Data></Cell>
      <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.adminNotes || "-")}</Data></Cell>
    </Row>`
    })

    const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="HeaderStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Calibri" ss:Size="11"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="EvenRowStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="OddRowStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Laporan Inspeksi">
  <Table>
   <Column ss:Width="50"/>
   <Column ss:Width="110"/>
   <Column ss:Width="140"/>
   <Column ss:Width="110"/>
   <Column ss:Width="140"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="130"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`

    const blob = new Blob([xmlTemplate], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
