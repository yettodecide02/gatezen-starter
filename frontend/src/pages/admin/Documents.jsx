import { useEffect, useState } from "react";
import {
  FiFileText,
  FiTrash2,
  FiEye,
  FiUpload,
  FiX,
  FiDownload,
  FiFile,
  FiAlertCircle,
} from "react-icons/fi";
import axios from "axios";
import { getUser, getToken } from "../../lib/auth";

const API = import.meta.env.VITE_API_URL;

export default function Documents() {
  const [pdfs, setPdfs] = useState([]);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [communityId, setCommunityId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user?.communityId) {
        setLoading(false);
        return console.error("User has no communityId");
      }

      setCommunityId(user.communityId);
      await fetchPdfs(user.communityId);
      setLoading(false);
    };
    load();
  }, []);

  // Cleanup blob URL when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const fetchPdfs = async (cid) => {
    try {
      const res = await axios.get(`${API}/admin/pdfs?communityId=${cid}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setPdfs(res.data.pdfs);
    } catch (err) {
      console.error("Error fetching PDFs:", err);
    }
  };

  const uploadPdf = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a PDF file.");
      return;
    }
    if (!communityId) {
      alert("Community ID missing.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("communityId", communityId);
    formData.append("name", name);

    try {
      setUploading(true);
      await axios.post(`${API}/admin/pdf`, formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setFile(null);
      setName("");
      fetchPdfs(communityId);

      // Show success message
      alert("PDF uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deletePdf = async (id) => {
    if (!confirm("Are you sure you want to delete this PDF?")) return;

    try {
      await axios.delete(`${API}/admin/pdf/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setPdfs((prev) => prev.filter((pdf) => pdf.id !== id));
      if (viewingPdf?.id === id) {
        setViewingPdf(null);
      }
    } catch (err) {
      console.error("Error deleting PDF:", err);
      alert("Failed to delete PDF");
    }
  };

  const viewPdf = async (pdf) => {
    setLoadingPdf(true);
    setViewingPdf(pdf);

    // Clean up previous blob URL
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }

    try {
      // Fetch PDF as arraybuffer (better for binary data)
      const response = await axios.get(`${API}/admin/pdf/${pdf.id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        responseType: "arraybuffer", // Changed from 'blob' to 'arraybuffer'
      });

      // Create blob from arraybuffer with correct MIME type
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      console.log("PDF Blob created:", {
        size: blob.size,
        type: blob.type,
        url: url,
      });

      setPdfBlobUrl(url);
    } catch (err) {
      console.error("Error loading PDF:", err);
      console.error("Error details:", err.response?.data);
      alert(
        "Failed to load PDF: " + (err.response?.data?.error || err.message)
      );
      setViewingPdf(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  const downloadPdf = async (id, pdfName) => {
    try {
      // Fetch PDF as arraybuffer
      const response = await axios.get(`${API}/admin/pdf/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        responseType: "arraybuffer",
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = pdfName || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to download PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3">
            <FiFileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              PDF Document Manager
            </h1>
            <p className="text-sm text-gray-600">
              Upload and manage your PDF documents
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload Form + PDF List */}
          <div className="space-y-6">
            {/* Upload Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <FiUpload className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload PDF
                </h2>
              </div>

              <form onSubmit={uploadPdf} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter document name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select PDF File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files[0])}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                  {file && (
                    <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                      <FiFile className="w-4 h-4" />
                      {file.name}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiUpload className="w-5 h-5" />
                  {uploading ? "Uploading..." : "Upload PDF"}
                </button>
              </form>
            </div>

            {/* PDF List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Documents ({pdfs.length})
              </h2>

              {pdfs.length === 0 ? (
                <div className="text-center py-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    No documents uploaded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pdfs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        viewingPdf?.id === pdf.id
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                          <FiFileText className="w-5 h-5 text-red-600" />
                        </div>
                        <span className="font-medium text-gray-900 truncate">
                          {pdf.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewPdf(pdf)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View PDF"
                        >
                          <FiEye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => downloadPdf(pdf.id, pdf.name)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <FiDownload className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deletePdf(pdf.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete PDF"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {viewingPdf ? (
                <>
                  {/* Viewer Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FiFileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {viewingPdf.name}
                        </h3>
                        <p className="text-sm text-gray-500">PDF Document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          downloadPdf(viewingPdf.id, viewingPdf.name)
                        }
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => setViewingPdf(null)}
                        className="p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* PDF Viewer */}
                  <div
                    className="relative"
                    style={{ height: "calc(100vh - 300px)" }}
                  >
                    {loadingPdf ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading PDF...</p>
                        </div>
                      </div>
                    ) : pdfBlobUrl ? (
                      <iframe
                        src={pdfBlobUrl}
                        className="w-full h-full"
                        title={viewingPdf.name}
                        style={{ border: "none" }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Unable to load PDF</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-22 px-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <FiFileText className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Document Selected
                  </h3>
                  <p className="text-gray-600 text-center max-w-md">
                    Select a document from the list to view it here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
