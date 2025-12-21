import { useEffect, useState } from "react";
import {
  FiFileText,
  FiEye,
  FiX,
  FiDownload,
  FiAlertCircle,
  FiSearch,
} from "react-icons/fi";
import axios from "axios";
import { getUser, getToken } from "../../lib/auth";

const API = import.meta.env.VITE_API_URL;

export default function Documents() {
  const [pdfs, setPdfs] = useState([]);
  const [filteredPdfs, setFilteredPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user?.communityId) {
        setLoading(false);
        return console.error("User has no communityId");
      }

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

  // Filter PDFs based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPdfs(pdfs);
    } else {
      const filtered = pdfs.filter((pdf) =>
        pdf.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPdfs(filtered);
    }
  }, [searchQuery, pdfs]);

  const fetchPdfs = async (cid) => {
    try {
      const res = await axios.get(`${API}/resident/pdfs?communityId=${cid}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setPdfs(res.data.pdfs || []);
      setFilteredPdfs(res.data.pdfs || []);
    } catch (err) {
      console.error("Error fetching PDFs:", err);
      setPdfs([]);
      setFilteredPdfs([]);
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
      const response = await axios.get(`${API}/resident/pdf/${pdf.id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        responseType: "arraybuffer",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setPdfBlobUrl(url);
    } catch (err) {
      console.error("Error loading PDF:", err);
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
      const response = await axios.get(`${API}/resident/pdf/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        responseType: "arraybuffer",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = pdfName || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <FiFileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            </div>
          </div>

          {/* Document Count Badge */}
          <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-sm font-medium text-indigo-700">
              {filteredPdfs.length}{" "}
              {filteredPdfs.length === 1 ? "Document" : "Documents"}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Document List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Available Documents
            </h2>

            {filteredPdfs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {searchQuery
                    ? "No documents match your search"
                    : "No documents available"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredPdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      viewingPdf?.id === pdf.id
                        ? "bg-indigo-50 border-indigo-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => viewPdf(pdf)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                        <FiFileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate mb-1">
                          {pdf.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>PDF Document</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewPdf(pdf);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <FiEye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadPdf(pdf.id, pdf.name);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {viewingPdf ? (
                <>
                  {/* Viewer Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FiFileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
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
                        onClick={() => {
                          setViewingPdf(null);
                          if (pdfBlobUrl) {
                            URL.revokeObjectURL(pdfBlobUrl);
                            setPdfBlobUrl(null);
                          }
                        }}
                        className="p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* PDF Viewer */}
                  <div
                    className="relative bg-gray-100"
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
                <div className="flex flex-col items-center justify-center py-32 px-6">
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
