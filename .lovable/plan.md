## Diagnóstico confirmado

O consumo diário chamado **Run** está vindo do **Lovable Cloud deste projeto**, principalmente do backend rodando continuamente:

- Cloud compute micro: 10,32 créditos no período
- Cloud compute XL: 7,43 créditos no período
- Cloud compute pico: 5,88 créditos no período
- Armazenamento e funções são valores pequenos em comparação

Não existe um limite de crédito configurado para este projeto, então não há uma trava já existente que eu possa apenas ajustar pelo chat.

## Plano para parar o consumo diário

1. **Pausar o Lovable Cloud deste projeto**
   - Isso interrompe database/auth/storage/functions enquanto estiver pausado.
   - É a forma direta de parar o custo recorrente de compute/Run.
   - Impacta somente este projeto.

2. **Preservar os dados**
   - PDFs, registros, colaboradores, obras, compras e documentos não são apagados.
   - Eles ficam indisponíveis enquanto o backend estiver pausado.
   - Ao reativar o Cloud, os dados voltam a ficar acessíveis.

3. **Confirmar o estado após pausar**
   - Depois da pausa, verificar o status do backend para garantir que ficou inativo.

## Impacto esperado

- O app publicado/preview pode abrir parcialmente, mas funcionalidades que dependem de login, banco, documentos, compras, obras e anexos deixarão de funcionar até reativar.
- O consumo recorrente de Run/compute deve parar enquanto o Cloud estiver pausado.

## Próximo passo

Ao aprovar este plano, vou pausar o Lovable Cloud deste projeto e confirmar o status.