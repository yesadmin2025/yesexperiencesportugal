# Gestão completa das fotografias dos cinco caminhos

## Resultado
Uma página de administração móvel e simples para gerir, por caminho, a fotografia, título, rota e destino. As alterações serão pré-visualizadas imediatamente no cartão e no painel do mapa antes de publicar, e depois ficarão sincronizadas na homepage.

## Implementação
- Usar a nova coleção `home_path_content` como fonte publicada dos cinco caminhos: Studio, Signature, Travel Designer, Moments e Corporate.
- Atualizar o gestor para editar fotografia, título, rota, destino, descrição visual e ligação de origem opcional.
- Mostrar, em cada edição, duas pré-visualizações em tempo real: cartão da homepage e painel do mapa.
- Permitir guardar texto mesmo sem escolher uma fotografia nova; quando existir ficheiro novo, comprimir, carregar e publicar tudo numa só ação.
- Atualizar cartões e mapa para lerem exatamente o mesmo registo, evitando divergências.
- Manter as cinco fotografias reais atuais como conteúdo inicial publicado.
- Validar acesso administrativo, mobile 393 px, ausência de cortes, upload, atualização imediata e fallback seguro.
- Publicar e confirmar a página e a homepage em produção.

## Segurança e verdade
- Escrita apenas para administradores; leitura pública apenas de registos publicados.
- Fotografias ficam em armazenamento controlado, sem hotlinks frágeis das redes sociais.
- Rotas e destinos são editáveis como texto editorial, sem alterar itinerários, preços, inventário ou reservas.
