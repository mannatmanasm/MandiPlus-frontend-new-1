"use client";

type Props = {
  onUpload: (file: File) => void;
};

export default function PdfUploader({ onUpload }: Props) {
  return (
    <label
      className="flex flex-col items-center justify-center
                 border-2 border-dashed border-gray-300
                 rounded-lg p-10 cursor-pointer
                 bg-white hover:bg-gray-50"
    >
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onUpload(e.target.files[0]);
          }
        }}
      />

      <div className="text-center">
        <p className="text-lg font-medium text-gray-700">
          Upload insurance PDF
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Click to select PDF file
        </p>
      </div>
    </label>
  );
}
