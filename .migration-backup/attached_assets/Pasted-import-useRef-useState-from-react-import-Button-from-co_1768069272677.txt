import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

type ImportExcelButtonProps = {
  endpoint: string;               // e.g. "/api/import/branches"
  label?: string;                 // button label
  accept?: string;                // file accept
  onDone?: (result: any) => void; // callback after success (json)
};

export default function ImportExcelButton({
  endpoint,
  label,
  accept = ".xlsx,.xls",
  onDone,
}: ImportExcelButtonProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickFileText =
    (t as any)?.common?.chooseFile || "Choose file";
  const noFileText =
    (t as any)?.common?.noFileSelected || "No file selected";
  const uploadingText =
    (t as any)?.common?.uploading || "Uploading...";
  const importSuccessText =
    (t as any)?.common?.importSuccess || "Import successful";
  const chooseFirstText =
    (t as any)?.common?.pleaseChooseFile || "Please choose a file first";

  const defaultLabel =
    (t as any)?.common?.import || "Import";
  const buttonLabel = label ?? defaultLabel;

  const pickFile = () => inputRef.current?.click();

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const upload = async () => {
    if (!file) {
      toast({ title: chooseFirstText, variant: "destructive" });
      return;
    }

    try {
      setIsUploading(true);

      const form = new FormData();
      // backend expects field name = "file"
      form.append("file", file);

      const res = await fetch(endpoint, {
        method: "POST",
        body: form,
      });

      // parse json (even if non-200)
      let data: any = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { ok: false, error: text || "Invalid response" };
      }

      if (!res.ok || data?.ok === false) {
        const errMsg =
          data?.error ||
          data?.message ||
          `Upload failed (${res.status})`;
        toast({ title: errMsg, variant: "destructive" });
        return;
      }

      toast({ title: importSuccessText });
      onDone?.(data);

      // reset input so selecting same file again triggers change
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      toast({ title: err?.message || "Upload error", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onSelectFile}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={pickFile} disabled={isUploading}>
          {pickFileText}
        </Button>

        <div className="text-sm text-muted-foreground truncate max-w-[320px]">
          {file ? file.name : noFileText}
        </div>
      </div>

      <Button type="button" onClick={upload} disabled={!file || isUploading}>
        {isUploading ? uploadingText : buttonLabel}
      </Button>
    </div>
  );
}
