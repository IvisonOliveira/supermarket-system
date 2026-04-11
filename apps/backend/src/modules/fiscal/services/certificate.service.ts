import { Injectable, Logger, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseConfig } from '../../../config/supabase.config';
import { ConfigService } from '@nestjs/config';
import * as forge from 'node-forge';
import * as crypto from 'crypto';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly supabaseConfig: SupabaseConfig,
    private readonly configService: ConfigService,
  ) {
    // Fallback de desenvolvimento. Deve ser preenchido no .env
    const rawKey = this.configService.get<string>('CERTIFICATE_ENCRYPTION_KEY') || 'default-supermarket-secret-32b!';
    // Garante que tenha 32 bytes validos para AES-256 usando SHA-256
    this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest();
  }

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  private encryptBuffer(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private decryptBuffer(encryptedBuffer: Buffer): Buffer {
    const iv = encryptedBuffer.subarray(0, 16);
    const data = encryptedBuffer.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  async upload(fileBuf: Buffer, password: string) {
    try {
      // 1. Extração de Metadados via node-forge (PKCS#12)
      const p12Der = forge.util.createBuffer(fileBuf.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      
      // Essa linha explodirá exception se a senha estiver errada:
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

      let certBag: forge.pkcs12.Bag | null = null;
      for (const safeContent of p12.safeContents) {
        for (const bag of safeContent.safeBags) {
          if (bag.type === forge.pki.oids.certBag) {
            certBag = bag;
            break;
          }
        }
        if (certBag) break;
      }

      if (!certBag) {
        throw new BadRequestException('Certificado (CertBag) não encontrado dentro do arquivo PFX.');
      }

      const cert = certBag.cert as forge.pki.Certificate;
      const validUntil = cert.validity.notAfter;
      let razaoSocial = '';
      let cnpj = '';

      cert.subject.attributes.forEach((attr: any) => {
        if (attr.shortName === 'CN') razaoSocial = attr.value;
      });
      
      // Procura regex bruta do formato de CNPJ contido em atributos do certificado A1
      const subjectStr = cert.subject.attributes.map((a: any) => a.value).join(' ');
      const cnpjMatch = subjectStr.match(/\d{14}/);
      if (cnpjMatch) {
         cnpj = cnpjMatch[0];
      } else {
         cnpj = 'Desconhecido';
      }

      // 2. Proteção AES-256 antes da cloud
      const encryptedFile = this.encryptBuffer(fileBuf);

      // 3. Upload no bucket Supabase 'certificates'
      const fileName = `cert_${Date.now()}.enc`;
      const { data: storageData, error: storageErr } = await this.supabase.storage
        .from('certificates')
        .upload(fileName, encryptedFile, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (storageErr) throw new Error(`Falha no bucket: ${storageErr.message}`);

      // 4. Grava Metadados - Remove docs legados
      await this.supabase.from('certificate_config').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 

      const { error: dbErr } = await this.supabase.from('certificate_config').insert({
         cnpj,
         razao_social: razaoSocial,
         valid_until: validUntil.toISOString(),
         storage_path: storageData.path,
      });

      if (dbErr) throw new Error(`Falha na base de dados ao registrar cert: ${dbErr.message}`);

      this.logger.log(`[CERTIFICADO] Novo certificado criptografado e salvo, expira em: ${validUntil.toISOString()}`);
      return { cnpj, razaoSocial, validUntil };

    } catch (err: any) {
      if (err.message && err.message.includes('MAC MAC')) {
         throw new BadRequestException('Senha do certificado incorreta ou arquivo violado.');
      }
      throw new BadRequestException(`Erro processando certificado: ${err.message}`);
    }
  }

  async getStatus() {
    const { data } = await this.supabase
      .from('certificate_config')
      .select('*');

    if (!data || data.length === 0) return null;
    
    const certConfig = data[0];
    const validUntilDate = new Date(certConfig.valid_until);
    const diffTime = validUntilDate.getTime() - new Date().getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      cnpj: certConfig.cnpj,
      razaoSocial: certConfig.razao_social,
      validoAte: certConfig.valid_until,
      diasRestantes,
      ativo: diasRestantes > 0
    };
  }

  async getCertificate() {
    const { data } = await this.supabase
      .from('certificate_config')
      .select('storage_path')
      .single();

    if (!data) throw new NotFoundException('Nenhum certificado configurado na base.');

    const { data: fileData, error } = await this.supabase.storage
      .from('certificates')
      .download(data.storage_path);

    if (error || !fileData) {
      throw new ConflictException('Erro ao resgatar arquivo encriptado do storage.');
    }

    const encryptedBuffer = Buffer.from(await fileData.arrayBuffer());
    return this.decryptBuffer(encryptedBuffer);
  }
}
