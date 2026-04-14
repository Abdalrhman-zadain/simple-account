import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Get('next-code')
  getNextCode(
    @Query('parentId') parentId?: string,
    @Query('isPosting') isPosting?: string,
    @Query('type') type?: string,
  ) {
    return this.accountsService.generateNextCode(parentId || null, {
      isPosting: isPosting ? isPosting === 'true' : true,
      type,
    });
  }

  @Get()
  list(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('isPosting') isPosting?: string,
    @Query('search') search?: string,
    @Query('parentAccountId') parentAccountId?: string,
    @Query('view') view?: string,
  ) {
    if (view === 'selector') {
      return this.accountsService.listSelectorOptions({ type, isActive, isPosting, search, parentAccountId });
    }
    if (view === 'table') {
      return this.accountsService.listTableRows({ type, isActive, isPosting, search, parentAccountId });
    }

    return this.accountsService.list({ type, isActive, isPosting, search, parentAccountId });
  }

  @Get('hierarchy/tree')
  hierarchy(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('isPosting') isPosting?: string,
    @Query('search') search?: string,
  ) {
    return this.accountsService.hierarchy({ type, isActive, isPosting, search });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.accountsService.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.accountsService.deactivate(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.accountsService.activate(id);
  }
}
